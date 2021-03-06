const fs = require('fs');
const chalk = require('chalk');
const ncp = require('ncp');
const path = require('path');
const { promisify } = require('util');

const { gitInit, gitIgnore } = require('./init.d/git');
const dependencies = require('./init.d/dependencies');
const nodeVersion = require('./init.d/nodeVersion');
const packageJson = require('./init.d/packageJson');
const nodemon = require('./init.d/nodemon');
const createReactApp = require('./init.d/createReactApp');
const adjustReactConfig = require('./init.d/adjustReactConfig');

module.exports = { init };
async function init(options_raw) {
    const cwd = options_raw.title;
    const project = options_raw.project.toLowerCase()
    const lang = options_raw.language.toLowerCase()

    const options = { ...options_raw, cwd, project, lang };

    options.logger.info('cwd', cwd);
    options.logger.info('project', project);
    options.logger.info('lang', lang);

    const copyFiles = copyTemplateFiles(options);

    try {
        options.logger.info('creating dir: ', cwd);

        await fs.promises.mkdir(cwd, { recursive: true });

        project === 'react' && await createReactApp(options);
        project === 'react' && adjustReactConfig(options);

        project === 'node' && await packageJson(options);
        project === 'node' && await gitIgnore(options);
        project === 'node' && await nodemon(options);

        options.logger.info('copying files...');
        await copyFiles(getTemplates('common'));
        await copyFiles(getTemplates(`${project}/${lang}`));

        await gitInit(options);
        await nodeVersion(options);
        await dependencies(options);

        console.log('%s Project ready', chalk.green.bold('DONE'));
        console.log('\nNow run:');
        console.log(chalk.cyan(`cd ${cwd}`));
        console.log(chalk.cyan('yarn dev'));

        // for some reason the ora spinners won't exit
        // very likely something in my dodgey awaits, but this will do for now
        process.exit(0);

    } catch(e) {
        console.error(e);
    }
}

// --------------------------------------------
// utils
// --------------------------------------------

function copyTemplateFiles({ cwd: target, logger }) {
    return async template => {
        logger.info('creating template: ', template);
        logger.info('in target', target);

        promisify(fs.access)(template, fs.constants.F_OK)
            .then(() => {
                promisify(ncp)(template, target, { clobber: true });
            })
            .catch(() => { logger.info(`${template} does not exist`)});
    }
}

function getTemplates(dir) {
    return path.resolve(__dirname, '../templates', dir);
}
