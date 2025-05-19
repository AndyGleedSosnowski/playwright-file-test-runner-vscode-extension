import * as vscode from "vscode";

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    return vscode.workspace.workspaceFolders[0];
  }
  return undefined;
}

function getOrCreateTerminal(name?: string): vscode.Terminal {
  if (
    vscode.window.activeTerminal &&
    !vscode.window.activeTerminal.exitStatus
  ) {
    if (name && vscode.window.activeTerminal.name === name) {
      return vscode.window.activeTerminal;
    }
    if (!name) {
      return vscode.window.activeTerminal;
    }
  }
  if (name) {
    const existingTerminal = vscode.window.terminals.find(
      (t) => t.name === name && !t.exitStatus
    );
    if (existingTerminal) {
      return existingTerminal;
    }
    return vscode.window.createTerminal(name);
  }

  return vscode.window.createTerminal();
}

async function buildAndRunPlaywrightTestCommand(
  uri: vscode.Uri,
  repeatCountInput?: number | string
) {
  if (!uri || !uri.fsPath) {
    vscode.window.showErrorMessage("No file selected or URI is invalid.");
    return;
  }

  const relativeFilePath = vscode.workspace.asRelativePath(uri, false);
  const configuration = vscode.workspace.getConfiguration(
    "playwright-file-test-runner"
  );
  const configFile =
    configuration.get<string>("configFile") || "playwright.config.ts";
  const projectFromSettings = configuration.get<string>("project");

  let commandToRun = `npx playwright test "${relativeFilePath}"`;

  if (configFile) {
    commandToRun += ` --config "${configFile}"`;
  }
  if (projectFromSettings && projectFromSettings.trim() !== "") {
    commandToRun += ` --project ${projectFromSettings}`;
  }

  let actualRepeatCount = 0;
  if (typeof repeatCountInput === "string") {
    actualRepeatCount = parseInt(repeatCountInput, 10);
  } else if (typeof repeatCountInput === "number") {
    actualRepeatCount = repeatCountInput;
  }

  if (actualRepeatCount > 1) {
    commandToRun += ` --repeat-each ${actualRepeatCount}`;
  }

  const terminal = getOrCreateTerminal("Playwright Tests");
  terminal.show(true);
  terminal.sendText(commandToRun);
  vscode.window.showInformationMessage(
    `Attempting to run Playwright test: ${commandToRun}`
  );
}

export function activate(context: vscode.ExtensionContext) {
  const runOnceDisposable = vscode.commands.registerCommand(
    "playwright-file-test-runner.runTestOnce",
    (uri: vscode.Uri) => {
      buildAndRunPlaywrightTestCommand(uri);
    }
  );
  context.subscriptions.push(runOnceDisposable);

  const runTestAndPromptForRepeatsDisposable = vscode.commands.registerCommand(
    "playwright-file-test-runner.runTestAndPromptForRepeats",
    async (uri: vscode.Uri) => {
      const configuration = vscode.workspace.getConfiguration(
        "playwright-file-test-runner"
      );
      const currentRepeatSetting = configuration.get<number>("repeatEach");

      const repeatInput = await vscode.window.showInputBox({
        prompt:
          "Enter number of times to repeat each test (e.g., 2, 3). Enter 1 for a single run.",
        value: currentRepeatSetting?.toString() || "3",
        placeHolder: "Number of repeats (e.g., 3)",
        validateInput: (text) => {
          const num = parseInt(text, 10);
          if (isNaN(num) || num < 0) {
            return "Please enter a non-negative number (0 or more).";
          }
          return null;
        },
      });

      if (repeatInput === undefined) {
        vscode.window.showInformationMessage("Repeat test run cancelled.");
        return;
      }

      const newRepeatCount = parseInt(repeatInput, 10);

      if (!isNaN(newRepeatCount) && newRepeatCount >= 0) {
        if (newRepeatCount !== currentRepeatSetting) {
          try {
            await configuration.update(
              "repeatEach",
              newRepeatCount,
              vscode.ConfigurationTarget.Global
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to update 'repeatEach' setting.`
            );
          }
        }
        buildAndRunPlaywrightTestCommand(uri, newRepeatCount);
      } else {
        vscode.window.showErrorMessage("Invalid number entered for repeats.");
      }
    }
  );
  context.subscriptions.push(runTestAndPromptForRepeatsDisposable);

  const runCodegenDisposable = vscode.commands.registerCommand(
    "playwright-file-test-runner.runCodegen",
    () => {
      const configuration = vscode.workspace.getConfiguration(
        "playwright-file-test-runner"
      );
      const codegenSettingValue =
        configuration.get<string>("codegenURL")?.trim() || "";
      let resolvedTarget = codegenSettingValue;

      if (
        codegenSettingValue &&
        !codegenSettingValue.includes("://") &&
        !codegenSettingValue.includes("/") &&
        codegenSettingValue.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      ) {
        const envVarValue = process.env[codegenSettingValue];
        if (envVarValue) {
          resolvedTarget = envVarValue;
        }
      }

      let codegenCommand = "npx playwright codegen";
      if (resolvedTarget) {
        const escapedTarget = resolvedTarget.replace(/"/g, '\\"');
        codegenCommand += ` "${escapedTarget}"`;
      }

      const terminal = getOrCreateTerminal("Playwright Codegen");
      terminal.show(true);
      terminal.sendText(codegenCommand);
      vscode.window.showInformationMessage(
        `Attempting to run Playwright Codegen: ${codegenCommand}`
      );
    }
  );
  context.subscriptions.push(runCodegenDisposable);

  const settingsCompletionProvider =
    vscode.languages.registerCompletionItemProvider(
      { language: "jsonc", pattern: "**/settings.json" },
      {
        async provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position
        ) {
          const lineText = document.lineAt(position.line).text;
          const cursorPosition = position.character;

          const configFilePattern =
            /"playwright-file-test-runner\.configFile"\s*:\s*"(.*?)"/;
          const match = configFilePattern.exec(lineText);

          if (match) {
            const valueStartIndex = match.index + match[0].lastIndexOf('"') + 1;
            const valueEndIndex = match.index + match[0].length - 1;

            if (
              cursorPosition >= valueStartIndex &&
              cursorPosition <= valueEndIndex
            ) {
              const workspaceFolder = getWorkspaceFolder();
              if (!workspaceFolder) {
                return undefined;
              }

              const completionItems: vscode.CompletionItem[] = [];
              try {
                const configFiles = await vscode.workspace.findFiles(
                  "**/playwright*.config.ts",
                  "**/node_modules/**"
                );
                for (const fileUri of configFiles) {
                  const relativePath = vscode.workspace.asRelativePath(
                    fileUri,
                    false
                  );
                  const item = new vscode.CompletionItem(
                    relativePath,
                    vscode.CompletionItemKind.File
                  );
                  item.detail = "Playwright Config File";
                  item.insertText = relativePath;
                  const currentQuotesLength = match[1].length;
                  item.range = new vscode.Range(
                    position.line,
                    valueStartIndex,
                    position.line,
                    valueStartIndex + currentQuotesLength
                  );
                  completionItems.push(item);
                }
              } catch (error) {
                console.error(
                  "Error finding Playwright config files for suggestions:",
                  error
                );
              }
              return completionItems;
            }
          }
          return undefined;
        },
      }
    );
  context.subscriptions.push(settingsCompletionProvider);
}

export function deactivate() {}
