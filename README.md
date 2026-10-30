[![Node server CI](https://github.com/deepak-learnings/github-actions-hands-on/actions/workflows/node-server-ci.yml/badge.svg)](https://github.com/deepak-learnings/github-actions-hands-on/actions/workflows/node-server-ci.yml)

# github-actions-hands-on
Hands on practical exposure on Github Actions

## Local CRUD server

This Node.js HTTP server stores items in `node-localstorage` on disk in `.data/`.
Run it with `npm start` and set `PORT` to change the default port (`3000`).

| Method | Path | Action |
| --- | --- | --- |
| `GET` | `/items` | List all items |
| `POST` | `/items` | Create an item from a JSON object, for example `{"name":"demo"}` |
| `GET` | `/items/:id` | Read one item |
| `PUT` | `/items/:id` | Replace an item's fields |
| `DELETE` | `/items/:id` | Delete an item |

Run `npm run build` for a syntax check and `npm test` for the unit tests.
The `node-server-ci.yml` workflow runs the test job only after the build job
succeeds (`needs: build`); GitHub Actions jobs use separate runners, so each
job checks out the code and installs dependencies independently.
