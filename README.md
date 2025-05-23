# Playwright File Test Runner

A simple [Visual Studio Code](https://code.visualstudio.com/) extension that allows you to run a test by right-clicking one or more files in the file explorer view or by right-clicking an opened files tab, and then click 'Run Playwright Test' or 'Run Playwright Test with Repeats...'

![File context menu](https://andygleedsosnowski.com/dev/extensions/pwfiletestrunner/ext-file-context-menu.png "Test file context menu")

# Table of contents

1. [Install](#install)
2. [Settings](#settings)

## Install

Search the VS Code Marketplace for `Playwright File Test Runner by AGS`.

![VS Code Marketplace](https://andygleedsosnowski.com/dev/extensions/pwfiletestrunner/ext-marketplace.png "VS Code Marketplace")

Or Ctrl+P and either copy/paste or type the following command, and press enter:

`ext install playwright-file-test-runner`

## Settings

This extension has the following settings:

![VS Code Settings](https://andygleedsosnowski.com/dev/extensions/pwfiletestrunner/ext-settings.png "VS Code Settings")

- `playwright-file-test-runner.configFile`: The Playwright config file to use (e.g., playwright.config.ts). Suggestions are provided when editing settings.json.

- `playwright-file-test-runner.project`: The Playwright project to run (e.g., chromium, firefox, webkit). Leave empty to run all projects specified in the config for that test file.

- `playwright-file-test-runner.repeatEach`: Default number of times to repeat each test when prompted by 'Run Playwright Test with Repeats...' command. This value pre-fills the prompt and is updated by user input.

- `playwright-file-test-runner.codegen`: Ctrl+Shift+P command - URL for Playwright Codegen (e.g., https://playwright.dev). If empty, Codegen starts without a URL.\
  ![Codegen command](https://andygleedsosnowski.com/dev/extensions/pwfiletestrunner/ext-codegen-command.png "Codegen command")

## Release Notes

### 1.1.1

Added ability to run multiple selected tests from context menu.

### 1.1.0

Initial release of Playwright File Test Runner
