## Signup/Signin(use Clerk):
1) user can signup by entering their name, email and password. 
2) OTP will be sent to the used gmail to veryfiy if its real or fake.
3) after verification, user will be redirected to homepage.
4) for signin, user can enter registered email and password, and then will be redirected to homepage.
5) will also give an option to sign in using google oauth 2.0 via firebase.
6) we will use cookies to store login data, so that user ont have to signup again and again.

## Working:
1) user can paste multiple links of different services of backend, which will be stored in postgres. user will have to select the hitting timer.
(free services like uptime robot provide hitting time of 5min for free, 60sec and 30sec hitting are paid) & we ar going to provide them for free.
2) there will be a toggle switch for the user to turn off a specific job manually.


## Mailing:
1) initial mail will be sent to the user that you have setup a monitoring service for ${project}.
2) whenever our cron-job is not able to hit a backend and get status code as 200, then it sends mail to the specific user that your backend is failing, and its needs to be fixed.

## UI:
1) First page will be the Landing Page, it will be a hype page explaining what WTFup does.

## Tech Stack:
Frontend: React
Backend: Bun
Database: Postgres + Prisma
Caching: Redis (cron management)
cron: Cronjob

