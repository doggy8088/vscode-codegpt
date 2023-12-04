import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

let logger: vscode.OutputChannel;

export function activate(ctx: vscode.ExtensionContext) {
  logger = vscode.window.createOutputChannel('CodeGPT');
  logger.appendLine('CodeGPT 已啟動');

  ctx.subscriptions.push(
    // https://stackoverflow.com/a/77595771/910074
    vscode.commands.registerCommand('codegpt.generateCommitMessage', async (rootUri: vscode.Uri, context: any, s) => {

      // vscode extensions - How to access the api for git in visual studio code - Stack Overflow
      // https://stackoverflow.com/a/52423161/910074
      const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
      const api = gitExtension.getAPI(1);
      const repo = api.repositories[0];
      logger.appendLine(`Git Repo Root ${repo.rootUri}`);

      // repo: repository,rootUri,inputBox,state,ui
      // logger.appendLine(`repo: ${Object.keys(repo)}`);

      const workingDir = fileURLToPath(repo.rootUri.toString());
      process.chdir(workingDir);

      logger.appendLine(`Working directory: ${process.cwd()}`);

      const commandBuilder = (command: string) => {
        return {
          withOption: (option: string, value: string) => {
            command += ` ${option} ${value}`;
            return commandBuilder(command);
          },
          build: () => {
            return command;
          }
        };
      };

      // TODO: 這裡應該要用 vscode.workspace.getConfiguration('codegpt').get('codegptPath') 來取得執行檔路徑
      const commitCommand = commandBuilder('codegpt commit')
        .withOption('--preview', '')
        // TODO: 這裡應該要用 vscode.workspace.getConfiguration('codegpt').get('diffUnified') 來取得 unified 參數
        .withOption('--diff_unified', '5')
        .build();

      exec(commitCommand, (error, stdout, stderr) => {
        if (error) {
          logger.appendLine(`Error: ${error.message}`);
          vscode.window.showErrorMessage(error.message);
          return;
        }

        if (stderr) {
          logger.appendLine(`stderr: ${stderr}`);
          vscode.window.showErrorMessage(stderr);
          return;
        }

        logger.appendLine(`stdout: ${stdout}`);

        getCommitMessage().then((commitMessage) => {
          repo.inputBox.value = commitMessage;
        });
      });

    })
  );
}

function getCommitMessage(): Promise<string> {
  return new Promise((resolve, reject) => {
    const commitEditMsgPath = '.git/COMMIT_EDITMSG';
    fs.readFile(commitEditMsgPath, 'utf8', (err, data) => {
      if (err) {
        logger.appendLine(`Error reading ${commitEditMsgPath}: ${err}`);
        vscode.window.showErrorMessage(`Error reading ${commitEditMsgPath}: ${err}`);
        reject(err);
        return;
      }
      const commitMessage = data.trim();
      logger.appendLine(`Commit message: ${commitMessage}`);
      resolve(commitMessage);
    });
  });
}

export function deactivate() { }
