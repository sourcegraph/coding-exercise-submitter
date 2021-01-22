This repository houses the CLI used in frontend coding exercises to upload submissions.

The CLI is published to NPM, included as a `devDependency` of the exercise and run with an included npm script (`npm run submit`).
It uploads the folder as a TAR archive to a Google Cloud function, which creates a private Codesandbox in our Codesandbox Pro workspace.
The URL of the private sandbox is returned to the CLI, which prints the URL and asks the candidate to send us an email containing the URL.

The server can be found in the `server/` folder and is deployed manually [as this Google Cloud Function](https://console.cloud.google.com/functions/details/us-central1/submit-coding-exercise?project=sourcegraph-dev) by simply copy-pasting the built JavaScript into the web UI.
