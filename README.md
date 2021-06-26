# github-update-readme-v2

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## About

I want publish acation used by myself so, I modify the source code amd create a new repo, so that I can publish the action.

This GitHub Action updates your repo README.md to show your latest activity.

## Inputs

### `header`

**Required** The header of your README.md. Markdown supported.

### `subhead`

The subheader of your README.md. Markdown supported. Default `""`.

### `footer`

The footer of your README.md. Markdown supported. Default `""`.

### `path`

Path of your README.md file. Default `"README.md"`.

### `ref`

Override the default branch/tag ref. Default `"master"`.

### `repoCount`

Number of repositories to load. Default `0`.

### `reposPerRow`

Number of repositories to load per row. Default `"3"`.

### `imageSize`

Length (in pixels) of each side of the square image. Default `"150"`.

### `excludeActivity`

Types of event to exclude from the recent activity table in a **JSON array**. Recent events, such as `"PushEvent"` or `"ForkEvent"`, can be found at https://api.github.com/users/{username}/events, replacing `username` with your username. Example input would be `'["WatchEvent", "ForkEvent"]'`. Default `"[]"`.

### `includeReposOrExcludeRepos`(New feature in v2)

Choose include or exclude the repositories in recent activity table.
- required: false
- type: `String`
- value: `exclude` | `include`
- default: `exclude`

### `showTrafficData`(New feature in v2)

Whether show repo traffic data in readme
- required: `false`
- type: `Boolean`
- default: `false`

### `trafficDataPosition`(New feature in v2)

Show traffic data in `subhead` or `footer`
- type: `String`
- value: `subhead` | `footer`
- default: `subhead`

### `repos`

Repositories to include or exclude from the recent activity tables in a **JSON array**. Example input would be `'["theboi/theboi", "username/repo"]'`. Default `"[]"`.

### `customReadmeFile`

Customise the README.md file format without forking this repository. Markdown supported.

Use these reserved strings wrapped in `${` and `}` (For instance, `${header}`) to reference certain content:
- `repoTable`: Set of tables with most recent repository activity.
- `header`
- `subhead`
- `footer`

```yaml
Default: |
  ## ${header}
      
  ${subhead}
      
  ${repoTable}
      
  ${footer}
```

Note: `|` denotes a multiline string block in YAML. Ensure you indent properly when setting this.

## Environment Inputs

### `GITHUB_TOKEN`

**Required** Set this to: `${{ secrets.GITHUB_TOKEN }}`

## Outputs

### `repositories`

Array of recent repositories to be displayed on your profile README.md.

## Example usage

- Create a repository named your username, add a `README.md` file.
- Create a workflow and paste this under `steps`:
```yaml
- name: github-update-readme-v2
  uses: Ligengxin96/github-update-readme-v2@v1.2-Beta
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    header: "This is header content"
    subhead: "This is subhead content"
    footer: "This is footer content"
```
- You might want to schedule this to run every 10 mins, paste this under `on`:
```yaml
schedule:
  - cron: "*/10 * * * *"
```
- This will now run and fetch repositories you were most recently active on, every 10 mins.
- **Important** Add a `DISPLAY.jpg` to your repositories (including username/username) to show in the table. If image does not exist, will default to `DISPLAY.jpg` on username/username.

- [Click here to see detailed example](https://github.com/Ligengxin96/FetchBingDailyImage/blob/main/.github/workflows/updateREADMEToTriggerDeploy.yml)

## Note

- Due to GitHub's API rate-limiting, this GitHub Action will, at most, only check your 1000 most recent activities.
- This is also my first GitHub Action so feel free to suggest improvements/submit a PR. Thanks!
