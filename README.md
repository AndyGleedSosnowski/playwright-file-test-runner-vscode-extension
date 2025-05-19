# Playwright File Test Runner

A simple [Visual Studio Code](https://code.visualstudio.com/) extension that allows you to run a test by right-clicking a file in the explorer view or by right-clicking an opened files tab, and then click 'Run Playwright Test' or 'Run Playwright Test with Repeats...'

# Table of contents

1. [Install](#install)
2. [Settings](#settings)

## Install

Launch VS Code, then (Ctrl+P) and either copy/paste or type the following command, and press enter:

```
ext install playwright-file-test-runner
```

Or in VS Code Marketplace, search for `playwright file test runner`.

## Settings

This extension has the following settings:

- `playwright-file-test-runner.configFile`: The Playwright config file to use (e.g., playwright.config.ts). Suggestions provided when editing settings.json.
- `playwright-file-test-runner.project`: The Playwright project to run (e.g., chromium, firefox, webkit). Leave empty to run all projects specified in the config for that test file.
- `playwright-file-test-runner.repeatEach`: Default number of times to repeat each test when prompted by 'Run Playwright Test with Repeats...' command. This value pre-fills the prompt and is updated by user input.
- `playwright-file-test-runner.codegen`: URL for Playwright Codegen (e.g., https://playwright.dev). If empty, Codegen starts without a URL.

## Release Notes

### 1.0.7

Initial release of Playwright File Test Runner
