import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export async function scaffoldContent() {
  const choice = await select({
    message: 'What would you like to author?',
    choices: [
      { name: 'Concept', value: 'concept' },
      { name: 'Mechanism', value: 'mechanism' },
      { name: 'Topic', value: 'topic' },
      { name: '⬅️  Back', value: 'back' }
    ]
  });

  if (choice === 'back') return;

  const id = await input({ message: `Enter the ID (e.g. ${choice}.name):` });
  const name = await input({ message: 'Enter the display name:' });

  const contentDir = path.join(process.cwd(), 'content', choice + 's');
  
  if (choice === 'topic') {
    const slug = id.replace('topic.', '');
    const topicDir = path.join(contentDir, slug);
    if (!fs.existsSync(topicDir)) {
      fs.mkdirSync(topicDir, { recursive: true });
    }
    const topicJson = {
      schema_version: "2.0",
      topic_id: id,
      display_name: name,
      status: "draft",
      prerequisites: [],
      mechanism_family: "",
      learning_objectives: [],
      invariant: {
        statement: "",
        why_it_matters: "",
        violation_condition: "",
        investigation_question: ""
      }
    };
    fs.writeFileSync(path.join(topicDir, 'topic.json'), JSON.stringify(topicJson, null, 2));
    fs.writeFileSync(path.join(topicDir, 'claims.json'), JSON.stringify({ schema_version: "2.0", topic_id: id, claims: [] }, null, 2));
    fs.writeFileSync(path.join(topicDir, 'assessment.json'), JSON.stringify({ schema_version: "2.0", topic_id: id, learning_objectives: [], scenarios: [] }, null, 2));
    fs.mkdirSync(path.join(topicDir, 'editorial'), { recursive: true });
    fs.mkdirSync(path.join(topicDir, 'diagrams'), { recursive: true });
    console.log(chalk.green(`\nTopic scaffolded successfully at content/topics/${slug}/\n`));
  } else {
    const jsonTemplate = {
      schema_version: "2.0",
      [`${choice}_id`]: id,
      display_name: name,
      description: ""
    };
    fs.writeFileSync(path.join(contentDir, `${id.replace(`${choice}.`, '')}.json`), JSON.stringify(jsonTemplate, null, 2));
    console.log(chalk.green(`\n${choice} scaffolded successfully!\n`));
  }
}
