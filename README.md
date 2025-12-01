# Railway Calendar Application

A sophisticated web-based calendar application designed specifically for Network Rail's week numbering system. Provides an intuitive interface for viewing railway weeks, periods, and Gregorian calendar dates with integrated astronomical and payroll features.

![Railway Calendar](https://img.shields.io/badge/version-1.0-blue)
![React](https://img.shields.io/badge/React-18+-61dafb)
![License](https://img.shields.io/badge/license-Network%20Rail-orange)

## Features

### Three View Modes

- **Week View**: Displays 7 days (Saturday to Friday) as a visual timeline with railway track-style design
- **Month View**: Traditional calendar grid with railway week numbers and color-coded periods
- **Year View**: Overview of entire railway year with all 13 periods

### Astronomical Features

- **Moon Phase Tracking**: Accurate lunar phases with illumination percentages
- **Day Length Calculations**: Sunrise/sunset times and daylight duration for London, UK
- **Seasonal Indicators**: Visual representation of changing day lengths

### Payroll Integration

- **Payday Tracking**: 4-weekly payday schedule with visual indicators
- **Animated Markers**: Bouncing coin emoji with sparkle effects on payday

### UK Events & Holidays

- **Bank Holidays**: All official UK bank holidays
- **Religious Events**: Christian, Diwali, Hanukkah, Eid celebrations
- **Cultural Events**: Burns Night, Halloween, Bonfire Night, and more

## Railway Year System

- **Railway Year**: Runs from the last Saturday of March to the Friday before the following year's last Saturday of March
- **Week 1, Day 1**: Always the last Saturday of March
- **Structure**: 7 days per week (Saturday through Friday), 4 weeks per period, typically 13 periods per railway year
- **Total Weeks**: Either 52 or 53 weeks depending on the year

### Example

- Railway Year 2025/26 starts: March 29, 2025 (Saturday)
- Railway Year 2025/26 ends: March 27, 2026 (Friday)

## Live Demo

Visit the live application at: **[Your GitHub Pages URL]**

## Getting Started

### Quick Start (GitHub Pages)

This application is deployed on GitHub Pages and requires no installation. Simply visit the URL above to use it.

### Local Development

If you want to modify the application:

1. Clone the repository:
   ```bash
   git clone https://github.com/[your-username]/Railway-calendar.git
   cd Railway-calendar
   ```

2. Open `index.html` in a web browser:
   ```bash
   # On macOS
   open index.html

   # On Linux
   xdg-open index.html

   # On Windows
   start index.html
   ```

3. Or use a local web server:
   ```bash
   # Using Python 3
   python -m http.server 8000

   # Using Node.js http-server
   npx http-server
   ```

4. Open your browser to `http://localhost:8000`

## Usage Guide

### Navigation

- **View Switcher**: Toggle between Week/Month/Year views
- **Navigation Buttons**: Use arrows to move between years, months, or weeks
- **Today Button**: Quickly jump to the current date
- **Week Scrubber**: In Week view, click any week number to jump directly to it

### Interactive Elements

- **Click Day Cards**: Navigate to week view for that day
- **Click Week Numbers**: Jump to that specific week
- **Click Period Cards**: Navigate to first week of period
- **Hover Elements**: View detailed tooltips with full date information

### Visual Indicators

- **Today**: Cyan ring with pulsing animation
- **Payday**: Gold gradient with bouncing coin emoji 💰
- **Bank Holidays**: Rose/red background
- **Moon Phases**: 8 distinct phases shown with emoji
- **Day Length**: Visual progress bars showing daylight duration

## Technical Details

### Technology Stack

- **Frontend**: React 18+ (via CDN)
- **UI Icons**: Lucide React
- **Styling**: Inline CSS with glassmorphism effects
- **Transpilation**: Babel Standalone (for JSX in browser)

### Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

### Performance

- Optimized with React useMemo and useCallback
- Hardware-accelerated CSS animations
- < 10ms render time on modern hardware

## Configuration

### Updating Payday Reference

Edit the `isPayday()` function in `railway-calendar.jsx`:

```javascript
const referencePayday = new Date(2025, 11, 5); // December 5, 2025
```

### Adding Custom Holidays

Add to the `getUKBankHolidays()` function:

```javascript
holidays.push({
  date: new Date(year, month, day),
  name: "Holiday Name",
  emoji: "🎉",
  type: "bank" // or "religious" or "cultural"
});
```

### Changing Location (Day Length)

Modify coordinates in the `getDayLength()` function:

```javascript
const latitude = 51.5074;  // Degrees North
const longitude = -0.1278; // Degrees West (negative)
```

## Known Limitations

1. **Approximate Religious Dates**: Non-Christian holidays use simplified approximations
2. **Single Timezone**: All calculations assume London, UK timezone
3. **Fixed Payday**: Single payday schedule (could support multiple)
4. **No Data Persistence**: No saving of preferences between sessions
5. **Client-Side Only**: Pure frontend application

## Future Enhancements

- Export calendar as PDF/image
- Custom events and reminders
- Multiple payday schedules
- Theme switcher (light mode, color schemes)
- Timezone support for other locations
- Integration with external calendars (iCal, Google Calendar)
- Enhanced accessibility features
- Print-friendly layouts

## Contributing

This application is designed for Network Rail personnel. If you have suggestions or find issues:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Project Structure

```
Railway-calendar/
├── index.html              # Main HTML file with React setup
├── railway-calendar.jsx    # Complete React application
├── README.md              # This file
├── .gitignore             # Git ignore rules
└── docs/                  # Technical specification (if needed)
```

## Credits

### Algorithms

- **Easter Calculation**: Anonymous Gregorian algorithm
- **Moon Phase**: Synodic month formula
- **Solar Position**: Standard astronomical formulas
- **Equation of Time**: Simplified approximation

### Data Sources

- Network Rail week numbering system
- UK Government bank holiday schedule
- Astronomical constants
- London coordinates (51.5074°N, 0.1278°W)

## License

Created by Colin McLaren and with AI..

## Version History

**v1.0** - Initial release (November 2025)
- Railway week calculation system
- Three view modes (Week/Month/Year)
- Moon phase integration
- Day length calculations
- UK holidays and events
- Payday tracking
- Responsive design with animations

## Support

For questions or issues, please contact the development team or create an issue in the GitHub repository.

---

**Made with ❤️ for Network Rail**
