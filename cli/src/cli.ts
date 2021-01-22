#!/usr/bin/env node
import * as tar from 'tar'
import got from 'got'
import * as stream from 'stream'
import { prompt } from 'inquirer'
import ora from 'ora'
import chalk from 'chalk'

const UPLOAD_URL =
    process.env.UPLOAD_URL || 'https://us-central1-sourcegraph-dev.cloudfunctions.net/submit-coding-exercise'

async function main(): Promise<void> {
    console.log('Ready to upload 🚀')
    const { fullName } = await prompt<{ fullName: string }>([
        { type: 'input', message: 'Please enter your full name:', name: 'fullName' },
    ])

    const tarStream = tar
        .create(
            {
                cwd: process.cwd(),
                filter: (path, stat) =>
                    !path.includes('node_modules') &&
                    !path.includes('.git') &&
                    !path.includes('dist') &&
                    !path.includes('.cache') &&
                    !path.includes('.vscode') &&
                    !path.endsWith('.tar') &&
                    !path.endsWith('.png') &&
                    !path.endsWith('.jpg') &&
                    !path.endsWith('.zip'),
            },
            ['.']
        )
        .pipe(new stream.PassThrough())

    const url = new URL(UPLOAD_URL)
    url.searchParams.set('fullName', fullName)

    console.log('')
    const spinner = ora('Uploading').start()

    try {
        const response = await got.post<{ sandboxUrl: string }>(url.href, { body: tarStream, responseType: 'json' })
        spinner.succeed('Success')
        console.log(
            '\nPlease send an email to us containing the following URL:\n' +
                chalk.bold.underline(response.body.sandboxUrl) +
                '\n'
        )
    } catch (error) {
        spinner.fail('Something went wrong')
        console.error(
            'Something went wrong uploading. As a workaround, please ZIP the folder, upload it to a cloud storage to your choice and send us the link. Sorry for the inconvenience.\n'
        )
        console.error('Full error details:', String(error))
    }
}

main().catch(error => {
    console.error(error)
    setTimeout(() => {
        process.exit(1)
    }, 500)
})
