---
sidebar_position: 1
---

# Tutorial

In this tutorial we'll walk you through creating a real-time collaborative todo application using FireSync. By the end you'll have a to-do list app with user registration and login, be able to create new to-do lists, share them with others users and edit them collaboratively with any changes one user makes instantly updating for other users.

Creating the app will consist of two parts:

- Installing and configuring the FireSync back-end.
- Writing a front-end React app that talks to the FireSync back-end.

## Prerequisites

### Node.js

FireSync comes as `npm` package, so you will need to have [Node.js](https://nodejs.org/) installed.

### Docker

It will be helpful if you have [Docker](https://www.docker.com/) installed, since Docker provides an easy way to create a local Postgres database for FireSync to store your data in.