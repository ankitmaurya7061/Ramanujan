# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Payments and Android APK

Razorpay orders are created and verified by the backend. Keep
`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env` only; never put the
secret in app configuration or an `EXPO_PUBLIC_` variable. The backend variable
names are listed in [backend/.env.example](./backend/.env.example).

Set `EXPO_PUBLIC_API_URL` to the backend base URL including `/api` (for example,
`https://api.example.com/api`). For local development, add it to an ignored
`.env` file. Android emulators can use `http://10.0.2.2:5000/api`; physical
devices need a reachable backend address. Release builds require this variable
to be set and use an HTTPS backend.

Sign in to EAS, configure the deployed backend URL in the EAS `production`
environment, and then build:

```sh
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://api.example.com/api --environment production --visibility plaintext
npx eas-cli@latest build --platform android --profile production
```

The `production` profile creates an installable APK. EAS may ask you to link
the project and create or select Android signing credentials. Razorpay needs a
development or release build; it is not available in Expo Go.
