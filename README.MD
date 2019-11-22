# EXPRESS TYPESCRIPT

---

## INIT PACKAGE

> npm install

## NPM SCRIPT

**Start Server with nodemon(ts-node)**

> npm run dev
> ( nodemon ts-node ./src/app.ts )

**TypeScript Compile (Configuration file-./tsconfig.json)**

> npm run build
> ( tsc )

**Copy NOT TypeScriptfiles**

> npm run copy
> ( copyfiles -u 1 \"src/\*_/!(_.ts)\" dist )

**Delete Compile Output Folder**

> npm run clean
> ( rimraf dist/)

**Start Server**

> npm start
> ( npm run clean && npm run build && npm run copy && npm dist/app.js )

## ENVIRONMENT VARIABLES

-   GOOGLE_APPLICATION_CREDENTIALS
    google api keyfile path
-   NODE_ENV
    development || test || deploy ...

## Server Route

```
(index page)
├──── /signin (user login)
├──── /signup (user sign up)
│     [Require Json WebToken]
├──── /logout (user logout)
├──── /tl (google translate api)
└──── /navi (kakao maps api)
```

```
[Require Json WebToken]
/member
├──── /info (info view)
└──── /modify (POST info modify)
```

```
[Require Json WebToken]
/admin
└──── /menu
      │ /admin
      │     ├──── /list (admin list)
      │     ├──── /token
      │     │       └──── /list (admin token list)
      │     └──── /log
      │             ├──── /login (login request log)
      │             └──── /action (admin action log)
      └ /member
            ├──── /list (member list)
            │──── /token
            │       └──── /list (member token list)
            └──── /log
                    └──── /login (login request log)
```

## Server directory (./src)

```
src
├──── config (private config files...like env...)
├──── middlewares (middleware module)
│    ├──── Some
│    ├──── Thing
│    ├──── Nested
│    └──── Modules
│         ├──── index.ts
│         ├──── Some.ts
│         └──── Module.ts
├──── models (Database tables model - sequelized model)
│    ├──── Some
│    ├──── Thing
│    ├──── Nested
│    └──── Modules
│         ├──── index.ts
│         ├──── Some.ts
│         └──── Module.ts
├──── public (Server static files)
│    ├──── js (javascript files)
│    ├──── css (css files)
│    └──── something ( another files like png, jpg ...)
├──── routes (Server routers modules)
│    ├──── Some
│    ├──── Thing
│    ├──── Nested
│    └──── Modules
│         ├──── index.ts
│         ├──── Some.ts
│         └──── Module.ts
├──── utils (Util modules)
├──── views (view files like html...)
│    ├──── Some
│    └──── Directory
│         ├──── include ( common files... header,footer...)
│         ├──── Some
│         └──── Directory
[.env] (environment files - dotenv library, Don't commit this file)
app.ts (Express server)
sequelize.ts (Sequelize-typescript Configuration file)
```

## Configuration files

### ES-LINT ([projectDir]/.eslintrc)

```json
{
    "env": {
        "browser": true,
        "es6": true, //transfiling support es6, if you want, can change options
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": ["@typescript-eslint"],
    "rules": {}
}
```

### Prettier ([ProjectDir]/.pretterrc)

```json
{
    "tabWidth": 4,
    "overrides": [
        {
            "files": ["*.html"],
            "options": {
                "printWidth": 120
            }
        }
    ]
}
```

#### Reference by

> https://velog.io/@velopert/eslint-and-prettier-in-react

## Sequelize (Database ORM MYSQL)

> sequelize-typescript
> https://github.com/RobinBuschmann/sequelize-typescript#type-safe-usage-of-auto-generated-functions

> sequelize (native)
> https://sequelize.org/v5/
