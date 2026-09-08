import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export async function browseKnowledgeBase() {
  let back = false;
  while (!back) {
    const choice = await select({
      message: 'Browse:',
      choices: [
        { name: 'Topics', value: 'topics' },
        { name: 'Mechanisms', value: 'mechanisms' },
        { name: 'Concepts', value: 'concepts' },
        { name: '⬅️  Back', value: 'back' }
      ]
    });

    if (choice === 'back') {
      back = true;
    } else {
      await browseCategory(choice);
    }
  }
}

async function browseCategory(category) {
  const dirPath = path.join(process.cwd(), 'content', category);
  if (!fs.existsSync(dirPath)) {
    console.log(chalk.red(`Directory not found: content/${category}`));
    return;
  }

  let items = [];
  if (category === 'topics') {
    const topicDirs = fs.readdirSync(dirPath).filter(f => fs.statSync(path.join(dirPath, f)).isDirectory());
    for (const dir of topicDirs) {
      const topicPath = path.join(dirPath, dir, 'topic.json');
      if (fs.existsSync(topicPath)) {
        const data = JSON.parse(fs.readFileSync(topicPath, 'utf8'));
        items.push({ name: data.display_name, value: { type: 'topic', path: topicPath, dir: path.join(dirPath, dir) }});
      }
    }
  } else {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      items.push({ name: data.display_name || data.concept_id || data.mechanism_id, value: { type: category, path: filePath }});
    }
  }

  if (items.length === 0) {
    console.log(chalk.yellow(`No items found in ${category}.`));
    return;
  }

  items.push({ name: '⬅️  Back', value: 'back' });

  const selection = await select({
    message: `Select a ${category.slice(0, -1)}:`,
    choices: items
  });

  if (selection !== 'back') {
    if (selection.type === 'topic') {
      await viewTopic(selection.dir);
    } else if (selection.type === 'mechanisms') {
      viewMechanism(selection.path);
    } else if (selection.type === 'concepts') {
      viewConcept(selection.path);
    } else {
      viewGenericJson(selection.path);
    }
  }
}

async function viewTopic(topicDir) {
  const topicPath = path.join(topicDir, 'topic.json');
  const data = JSON.parse(fs.readFileSync(topicPath, 'utf8'));

  console.log(chalk.bold.magenta(`\n=== Topic: ${data.display_name} ===`));
  console.log(chalk.cyan(`ID: ${data.topic_id} | Status: ${data.status}`));
  
  if (data.invariant) {
    console.log(chalk.bgRed.white('\n Security Invariant '));
    console.log(chalk.yellow(data.invariant.statement));
    console.log(data.invariant.why_it_matters);
  }

  if (data.causal_mechanism && data.causal_mechanism.steps) {
    console.log(chalk.bgBlue.white('\n Causal Mechanism '));
    data.causal_mechanism.steps.forEach(step => console.log(step));
  }

  console.log('\n');
}

function viewMechanism(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(chalk.bold.magenta(`\n=== Mechanism: ${data.display_name} ===`));
  console.log(chalk.cyan(`ID: ${data.mechanism_id} | Status: ${data.status}`));
  
  if (data.core_principle) {
    console.log(chalk.bgRed.white('\n Core Principle '));
    console.log(data.core_principle);
  }

  if (data.minimum_causal_signature) {
    console.log(chalk.bgBlue.white('\n Minimum Causal Signature '));
    const at = data.minimum_causal_signature.authority_transition;
    const authTransitionStr = typeof at === 'object' && at !== null
      ? Object.entries(at).map(([k, v]) => `\n  - ${k}: ${v}`).join('')
      : at;
    console.log(chalk.yellow('Authority Transition: ') + authTransitionStr);
    console.log(chalk.yellow('Decision Bypassed: ') + data.minimum_causal_signature.security_decision_bypassed);
    console.log(chalk.yellow('Failure Condition: ') + data.minimum_causal_signature.failure_condition);
  }

  if (data.investigation_question) {
    console.log(chalk.bgGreen.black('\n Investigation Question '));
    console.log(data.investigation_question);
  }

  console.log('\n');
}

function viewConcept(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(chalk.bold.magenta(`\n=== Concept: ${data.display_name} ===`));
  console.log(chalk.cyan(`ID: ${data.concept_id} | Status: ${data.status}`));
  
  if (data.summary) {
    console.log(chalk.bgCyan.black('\n Summary '));
    console.log(data.summary);
  }

  if (data.mental_model) {
    console.log(chalk.bgBlue.white('\n Mental Model '));
    console.log(data.mental_model);
  }

  if (data.security_relevance && data.security_relevance.length > 0) {
    console.log(chalk.bgRed.white('\n Security Relevance '));
    data.security_relevance.forEach(rel => console.log(`- ${rel}`));
  }

  if (data.common_assumptions && data.common_assumptions.length > 0) {
    console.log(chalk.bgYellow.black('\n Common Assumptions '));
    data.common_assumptions.forEach(a => {
      console.log(chalk.bold(`Assumption: ${a.assumption}`));
      console.log(`Why wrong: ${a.why_wrong}`);
    });
  }

  console.log('\n');
}

function viewGenericJson(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(chalk.bold.magenta(`\n=== ${path.basename(filePath)} ===`));
  console.log(JSON.stringify(data, null, 2));
  console.log('\n');
}
