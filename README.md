# ContentGrid Typescript packages monorepo

## Usage

For a list of packages and their documentation, see [the packages directory](./packages/)

Packages are published to NPM in the [`@contentgrid` organization](https://www.npmjs.com/org/contentgrid)

## Development

This monorepo is managed with [lerna](https://www.npmjs.com/org/contentgrid).

There are some scripts available at the top-level to make it easier to execute common commands across all packages:

- `yarn build`: Compile all packages
- `yarn test`: Run tests in all packages (packages need to be compiled first)


## Releasing

Packages are published automatically to NPM upon creating a GitHub release
