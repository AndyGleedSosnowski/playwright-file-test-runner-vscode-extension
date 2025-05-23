import * as vscode from "vscode";

// Helper function to get the primary workspace folder
function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    return vscode.workspace.workspaceFolders[0];
  }
  return undefined;
}

// Helper function to get or create a suitable terminal
function getOrCreateTerminal(name?: string): vscode.Terminal {
  if (
    vscode.window.activeTerminal &&
    !vscode.window.activeTerminal.exitStatus
  ) {
    if (!name || (name && vscode.window.activeTerminal.name === name)) {
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

// Central function to build and run the Playwright test command
async function buildAndRunPlaywrightTestCommand(
  target: vscode.Uri | vscode.Uri[],
  repeatCountInput?: number | string
) {
  if (!target) {
    vscode.window.showErrorMessage("No file or folder selected.");
    return;
  }

  let targetPathsString: string;

  if (Array.isArray(target)) {
    if (target.length === 0) {
      vscode.window.showErrorMessage("No files selected.");
      return;
    }
    const testFileUris = target.filter(
      (uri) =>
        uri.fsPath.endsWith(".spec.ts") || uri.fsPath.endsWith(".test.ts")
    );
    if (testFileUris.length === 0) {
      vscode.window.showErrorMessage(
        "No .spec.ts or .test.ts files found in selection."
      );
      return;
    }
    targetPathsString = testFileUris
      .map((uri) => `"${vscode.workspace.asRelativePath(uri, false)}"`)
      .join(" ");
  } else {
    if (!target.fsPath) {
      vscode.window.showErrorMessage("Invalid file selected.");
      return;
    }
    targetPathsString = `"${vscode.workspace.asRelativePath(target, false)}"`;
  }

  const configuration = vscode.workspace.getConfiguration(
    "playwright-file-test-runner"
  );
  const configFile =
    configuration.get<string>("configFile") || "playwright.config.ts";
  const projectFromSettings = configuration.get<string>("project");
  // const runHeaded = configuration.get<boolean>("headed"); // Removed headed setting

  let commandToRun = `npx playwright test ${targetPathsString}`;

  if (configFile) {
    commandToRun += ` --config "${configFile}"`;
  }
  if (projectFromSettings && projectFromSettings.trim() !== "") {
    commandToRun += ` --project ${projectFromSettings}`;
  }
  // Removed headed flag logic
  // if (runHeaded === true) {
  //   commandToRun += " --headed";
  // }

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
    `Attempting to run Playwright test(s): ${commandToRun}`
  );
}

export function activate(context: vscode.ExtensionContext) {
  const testCommandHandler = (
    usePromptForRepeats: boolean,
    firstUri?: vscode.Uri,
    selectedUris?: vscode.Uri[]
  ) => {
    let effectiveTarget: vscode.Uri | vscode.Uri[];

    if (selectedUris && selectedUris.length > 0) {
      effectiveTarget = selectedUris;
    } else if (firstUri) {
      effectiveTarget = firstUri;
    } else {
      vscode.window.showErrorMessage(
        "No file or folder target for test execution."
      );
      return;
    }

    if (usePromptForRepeats) {
      const configuration = vscode.workspace.getConfiguration(
        "playwright-file-test-runner"
      );
      const currentRepeatSetting = configuration.get<number>("repeatEach");

      vscode.window
        .showInputBox({
          prompt:
            "Enter number of times to repeat each test (e.g., 2, 3). Enter 0 or 1 for a single run.",
          value: currentRepeatSetting?.toString() || "3",
          placeHolder: "Number of repeats (e.g., 3)",
          validateInput: (text) => {
            const num = parseInt(text, 10);
            if (isNaN(num) || num < 0) {
              return "Please enter a non-negative number (0 or more).";
            }
            return null;
          },
        })
        .then(async (repeatInput) => {
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
                // Fail silently for setting update error
              }
            }
            buildAndRunPlaywrightTestCommand(effectiveTarget, newRepeatCount);
          } else {
            vscode.window.showErrorMessage(
              "Invalid number entered for repeats."
            );
          }
        });
    } else {
      buildAndRunPlaywrightTestCommand(effectiveTarget);
    }
  };

  const runOnceDisposable = vscode.commands.registerCommand(
    "playwright-file-test-runner.runTestOnce",
    (firstUri?: vscode.Uri, selectedUris?: vscode.Uri[]) => {
      testCommandHandler(false, firstUri, selectedUris);
    }
  );
  context.subscriptions.push(runOnceDisposable);

  const runTestAndPromptForRepeatsDisposable = vscode.commands.registerCommand(
    "playwright-file-test-runner.runTestAndPromptForRepeats",
    (firstUri?: vscode.Uri, selectedUris?: vscode.Uri[]) => {
      testCommandHandler(true, firstUri, selectedUris);
    }
  );
  context.subscriptions.push(runTestAndPromptForRepeatsDisposable);

  const runCodegenDisposable = vscode.commands.registerCommand(
    "playwright-file-test-runner.runCodegen",
    () => {
      const configuration = vscode.workspace.getConfiguration(
        "playwright-file-test-runner"
      );
      // Use the setting name from your package.json ("codegenURL")
      const codegenURLValue =
        configuration.get<string>("codegenURL")?.trim() || "";

      let codegenCommand = "npx playwright codegen";
      // Directly use the codegenURLValue; no environment variable resolution
      if (codegenURLValue && codegenURLValue.trim() !== "") {
        const escapedTarget = codegenURLValue.replace(/"/g, '\\"');
        codegenCommand += ` "${escapedTarget}"`;
      } else {
        // Optional: Inform user if no URL is provided and codegen will start blank
        vscode.window.showInformationMessage(
          "Playwright Codegen starting without a specific URL."
        );
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

            if (
              cursorPosition >= valueStartIndex &&
              cursorPosition <= valueStartIndex + match[1].length
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
                  item.range = new vscode.Range(
                    position.line,
                    valueStartIndex,
                    position.line,
                    valueStartIndex + match[1].length
                  );
                  completionItems.push(item);
                }
              } catch (error) {
                // Silently ignore
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
