# WebRTC – Stun Server

#### Table of Contents
- [Description](#description)
- [Running the App Locally](#running-the-app-locally)
- [Changes from Original Project](#changes-from-original-project)

## Description
An initial investigation into the use of Stun Servers with WebRTC, with an updated version of the first coursework project for [Robert Bunch's Udemy course](https://www.udemy.com/course/mastering-webrtc-part-2-real-time-video-and-screen-share).

## Running the App Locally
- CD into `server` folder and run `npm install`
- Ensure you have `mkcert` installed globally and run `mkcert create-ca`, followed by `mkcert create-cert`
- CD into `client` folder
- Run `npm install`
- Return to root project folder and run `npm run dev`

## Changes from Original Project
- Revised JavaScript solution to Vite-based React project
- Replaced original CSS styling with basic Tailwind setup