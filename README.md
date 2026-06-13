# Volunteer Scheduler Demo

A static front-end demo for a volunteer training scheduling platform.

## What it does

- Collects volunteer registration details
- Collects availability across predefined weekend training dates
- Prevents duplicate registrations by email
- Allows admin users to edit session capacity
- Automatically generates a draft training schedule
- Respects capacity limits
- Attempts to assign each volunteer exactly 8 sessions
- Shows scheduling conflicts
- Exports the generated schedule as CSV

## Demo data

The app stores data in browser `localStorage`. Use **Load sample volunteers** to populate demo records.

## Run locally

Open `index.html` directly in your browser.

## Deploy on GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Select **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/root` folder.
6. Save.

GitHub Pages will publish the demo as a public website.

## Files

- `index.html` — page structure
- `styles.css` — responsive styling
- `app.js` — demo data, validation, scheduling, and CSV export logic

## Notes

This is a front-end prototype. For production use, add authentication, a database, server-side validation, email notifications, and a stronger optimization engine such as OR-Tools.
