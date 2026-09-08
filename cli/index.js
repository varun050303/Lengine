#!/usr/bin/env node

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { browseKnowledgeBase } from './browse.js';
import { scaffoldContent } from './scaffold.js';
import { spawn } from 'child_process';
import path from 'path';

async function main() {
  console.clear();
  console.log(chalk.bold.cyan('========================================='));
  console.log(chalk.bold.cyan('        LENGINE v2.0 AUTHORING TUI        '));
  console.log(chalk.bold.cyan('=========================================\n'));

  let exit = false;
  while (!exit) {
    const choice = await select({
      message: 'Main Menu:',
      choices: [
        { name: '📖 Browse Knowledge Base', value: 'browse' },
        { name: '✏️  Author New Content', value: 'author' },
        { name: '🔍 Run Quality Gates', value: 'validate' },
        { name: '🚪 Exit', value: 'exit' }
      ]
    });

    switch (choice) {
      case 'browse':
        await browseKnowledgeBase();
        break;
      case 'author':
        await scaffoldContent();
        break;
      case 'validate':
        await runValidation();
        break;
      case 'exit':
        exit = true;
        console.log(chalk.green('Goodbye!'));
        break;
    }
    if (!exit) console.log('\n');
  }
}

async function runValidation() {
  return new Promise((resolve) => {
    console.log(chalk.blue('\nRunning pipeline/validate.js...\n'));
    const validator = spawn('node', [path.join(process.cwd(), 'pipeline', 'validate.js')], { stdio: 'inherit' });
    validator.on('close', (code) => {
      console.log(`\nValidation process exited with code ${code}\n`);
      resolve();
    });
  });
}

main().catch(err => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});
