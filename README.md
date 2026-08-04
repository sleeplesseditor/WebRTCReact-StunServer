# WebRTC – Stun Server

#### Table of Contents
- [Description](#description)
- [Running the App Locally](#running-the-app-locally)
- [Changes from Original Project](#changes-from-original-project)
- [Further Improvements to Make](#further-improvements-to-make)

## Description
An initial investigation into the use of Stun and Signalling Servers with WebRTC, with an updated version of the second coursework project for [Robert Bunch's Udemy course](https://www.udemy.com/course/mastering-webrtc-part-2-real-time-video-and-screen-share).

## Running the App Locally
- CD into `server` folder and run `npm install`
- Ensure you have `mkcert` installed globally and run `mkcert create-ca`, followed by `mkcert create-cert`
- CD into `client` folder
- Run `npm install`
- Return to root project folder and run `npm run dev`

## Changes from Original Project
- Revised JavaScript solution to rough prototype Vite-based React project with Node/Express backend
    - https option disabled temporarily. Prototype limited to communication between browsers on the same device as proof of concept
    - Elements broken out to simple components
    - Basic WebSockets setup for client
- Replaced original CSS styling with basic Material UI and SASS setup
- Added RTC logging for debugging efforts

## Further Improvements to Make
- Revise WebSockets setup for client
- Enable option for use of https