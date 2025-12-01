// NOTE: React hooks and Lucide icons are provided by the index.html file
// The following imports are commented out for browser compatibility:
// import React, { useState, useMemo, useCallback, useEffect } from 'react';
// import { ChevronLeft, ChevronRight, Calendar, Layers, Clock, Train, Sun, Sunrise, Sunset } from 'lucide-react';

// These are loaded globally from CDN in index.html
// Destructure React hooks from the global React object
const { useState, useMemo, useCallback, useEffect } = React;

// Icon components are available from window object (defined in index.html)
const ChevronLeft = window.ChevronLeft;
const ChevronRight = window.ChevronRight;
const Calendar = window.Calendar;
const Layers = window.Layers;
const Clock = window.Clock;
const Train = window.Train;
const Sun = window.Sun;
const Sunrise = window.Sunrise;
const Sunset = window.Sunset;

// ============================================================================
// RAILWAY DATE API MODULE
// ============================================================================

const RailwayDateAPI = {
  /**
   * Calculate day length, sunrise and sunset for London UK
   * Uses astronomical formulas based on Earth's axial tilt (23.44°)
   * London coordinates: 51.5074°N, 0.1278°W
   */
  getDayLength: (date) => {
    const d = new Date(date);
    const latitude = 51.5074; // London latitude in degrees
    const longitude = -0.1278; // London longitude in degrees (west is negative)
    
    // Convert degrees to radians
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;
    
    // Calculate day of year (1-366)
    const startOfYear = new Date(d.getFullYear(), 0, 0);
    const diff = d - startOfYear;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    // Solar declination angle (Earth's axial tilt effect)
    // Approximation using sinusoidal model
    const declination = toRad(23.44 * Math.sin(toRad((360 / 365) * (dayOfYear + 284))));
    
    // Latitude in radians
    const latRad = toRad(latitude);
    
    // Hour angle at sunrise/sunset
    // cos(hourAngle) = -tan(lat) * tan(declination)
    const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);
    
    // Handle polar day/night edge cases
    let hourAngle, dayLengthHours, sunrise, sunset;
    
    if (cosHourAngle < -1) {
      // Midnight sun (polar day) - doesn't happen in London but handle gracefully
      hourAngle = Math.PI;
      dayLengthHours = 24;
      sunrise = null;
      sunset = null;
    } else if (cosHourAngle > 1) {
      // Polar night - doesn't happen in London but handle gracefully
      hourAngle = 0;
      dayLengthHours = 0;
      sunrise = null;
      sunset = null;
    } else {
      hourAngle = Math.acos(cosHourAngle);
      
      // Day length in hours (Earth rotates 15° per hour)
      dayLengthHours = (2 * toDeg(hourAngle)) / 15;
      
      // Calculate solar noon (when sun is highest)
      // Equation of time correction (approximation)
      const B = toRad((360 / 365) * (dayOfYear - 81));
      const equationOfTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
      
      // Time correction for longitude (London is close to 0°, but not exactly)
      // Standard meridian for GMT is 0°
      const timeCorrection = 4 * longitude + equationOfTime; // in minutes
      
      // Solar noon in minutes from midnight (12:00 + corrections)
      const solarNoon = 12 * 60 - timeCorrection;
      
      // Sunrise and sunset times in minutes from midnight
      const halfDayMinutes = (dayLengthHours / 2) * 60;
      const sunriseMinutes = solarNoon - halfDayMinutes;
      const sunsetMinutes = solarNoon + halfDayMinutes;
      
      // Convert to hours:minutes format
      const formatTime = (minutes) => {
        const hrs = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };
      
      sunrise = formatTime(sunriseMinutes);
      sunset = formatTime(sunsetMinutes);
    }
    
    // Format day length as hours and minutes
    const hours = Math.floor(dayLengthHours);
    const minutes = Math.round((dayLengthHours - hours) * 60);
    const dayLengthFormatted = `${hours}h ${minutes}m`;
    
    // Calculate percentage of max possible daylight (summer solstice ~16.5h in London)
    const maxDayLength = 16.5;
    const minDayLength = 7.5;
    const dayLengthPercent = Math.round(((dayLengthHours - minDayLength) / (maxDayLength - minDayLength)) * 100);
    
    // Determine if days are getting longer or shorter
    const tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfYear = dayOfYear + 1;
    const tomorrowDeclination = toRad(23.44 * Math.sin(toRad((360 / 365) * (tomorrowDayOfYear + 284))));
    const tomorrowCosHourAngle = -Math.tan(latRad) * Math.tan(tomorrowDeclination);
    const tomorrowHourAngle = Math.acos(Math.max(-1, Math.min(1, tomorrowCosHourAngle)));
    const tomorrowDayLength = (2 * toDeg(tomorrowHourAngle)) / 15;
    const dayLengthChange = tomorrowDayLength - dayLengthHours;
    const daysGettingLonger = dayLengthChange > 0;
    const changeMinutes = Math.abs(Math.round(dayLengthChange * 60));
    
    return {
      dayLengthHours: Math.round(dayLengthHours * 100) / 100,
      dayLengthFormatted,
      dayLengthPercent: Math.max(0, Math.min(100, dayLengthPercent)),
      sunrise,
      sunset,
      daysGettingLonger,
      changeMinutes,
      changeFormatted: `${daysGettingLonger ? '+' : '-'}${changeMinutes}m`
    };
  },

  /**
   * Calculate moon phase for any date
   * Uses the synodic month (29.53059 days) from a known new moon reference
   * Returns phase info with emoji and name
   */
  getMoonPhase: (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // Known new moon reference: January 6, 2000 at 18:14 UTC
    const knownNewMoon = new Date(2000, 0, 6, 18, 14, 0);
    const synodicMonth = 29.53058867; // Average lunar cycle in days
    
    // Calculate days since known new moon
    const daysSinceNewMoon = (d.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    
    // Get position in current lunar cycle (0 to 29.53)
    let lunarDay = daysSinceNewMoon % synodicMonth;
    if (lunarDay < 0) lunarDay += synodicMonth;
    
    // Calculate illumination percentage (0-100)
    const illumination = Math.round((1 - Math.cos((lunarDay / synodicMonth) * 2 * Math.PI)) / 2 * 100);
    
    // Determine phase based on lunar day
    // Each phase is ~3.69 days (29.53 / 8)
    const phaseLength = synodicMonth / 8;
    
    let phase, emoji, name;
    
    if (lunarDay < phaseLength * 0.5) {
      phase = 0; emoji = '🌑'; name = 'New Moon';
    } else if (lunarDay < phaseLength * 1.5) {
      phase = 1; emoji = '🌒'; name = 'Waxing Crescent';
    } else if (lunarDay < phaseLength * 2.5) {
      phase = 2; emoji = '🌓'; name = 'First Quarter';
    } else if (lunarDay < phaseLength * 3.5) {
      phase = 3; emoji = '🌔'; name = 'Waxing Gibbous';
    } else if (lunarDay < phaseLength * 4.5) {
      phase = 4; emoji = '🌕'; name = 'Full Moon';
    } else if (lunarDay < phaseLength * 5.5) {
      phase = 5; emoji = '🌖'; name = 'Waning Gibbous';
    } else if (lunarDay < phaseLength * 6.5) {
      phase = 6; emoji = '🌗'; name = 'Last Quarter';
    } else if (lunarDay < phaseLength * 7.5) {
      phase = 7; emoji = '🌘'; name = 'Waning Crescent';
    } else {
      phase = 0; emoji = '🌑'; name = 'New Moon';
    }
    
    // Is this a "significant" phase? (New, First Quarter, Full, Last Quarter)
    const isSignificant = phase === 0 || phase === 2 || phase === 4 || phase === 6;
    
    return { phase, emoji, name, lunarDay, illumination, isSignificant };
  },

  /**
   * Calculate if a given date is a payday
   * Payday is every 4 weeks on Friday (the day before a new period starts on Saturday)
   * Reference payday: December 5, 2025 (Friday before Period 10)
   */
  isPayday: (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // Reference payday: December 5, 2025
    const referencePayday = new Date(2025, 11, 5); // Month 11 = December
    referencePayday.setHours(0, 0, 0, 0);
    
    // Calculate days difference
    const daysDiff = Math.round((d - referencePayday) / (1000 * 60 * 60 * 24));
    
    // Payday repeats every 28 days (4 weeks)
    // Check if this date is exactly divisible by 28 days from reference
    return daysDiff % 28 === 0;
  },

  /**
   * Get next payday from a given date
   */
  getNextPayday: (fromDate) => {
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    
    const referencePayday = new Date(2025, 11, 5);
    referencePayday.setHours(0, 0, 0, 0);
    
    // Find how many days until next payday
    let daysDiff = Math.round((d - referencePayday) / (1000 * 60 * 60 * 24));
    let daysUntilPayday = 28 - (daysDiff % 28);
    
    // If we're on a payday, get the next one
    if (daysUntilPayday === 28) daysUntilPayday = 0;
    
    const nextPayday = new Date(d);
    nextPayday.setDate(nextPayday.getDate() + daysUntilPayday);
    
    return nextPayday;
  },

  /**
   * Get the last Saturday of March for a given railway year
   * This is Week 1 Day 1 of that railway year
   */
  getWeekOneStart: (railwayYear) => {
    // Get the last day of March (March 31st)
    const lastDayOfMarch = new Date(railwayYear, 2, 31); // Month 2 = March
    const dayOfWeek = lastDayOfMarch.getDay(); // 0=Sun, 6=Sat
    
    // Calculate days to go back to reach Saturday
    // If March 31st is Saturday (6), go back 0 days
    // If March 31st is Sunday (0), go back 1 day to Saturday
    // If March 31st is Monday (1), go back 2 days to Saturday, etc.
    const daysToGoBack = (dayOfWeek + 1) % 7;
    
    const lastSaturday = new Date(railwayYear, 2, 31 - daysToGoBack);
    return lastSaturday;
  },

  /**
   * Get total weeks in a railway year (52 or 53)
   */
  getTotalWeeks: (railwayYear) => {
    const thisYearStart = RailwayDateAPI.getWeekOneStart(railwayYear);
    const nextYearStart = RailwayDateAPI.getWeekOneStart(railwayYear + 1);
    const days = Math.round((nextYearStart - thisYearStart) / (1000 * 60 * 60 * 24));
    return Math.floor(days / 7);
  },

  /**
   * Convert a Gregorian date to Railway Year + Rail Week + Day of Rail Week
   * Day of rail week: 1=Saturday, 2=Sunday, ..., 7=Friday
   */
  dateToRailway: (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // Determine which railway year this date belongs to
    let railwayYear = d.getFullYear();
    let weekOneStart = RailwayDateAPI.getWeekOneStart(railwayYear);
    
    // If date is before this calendar year's Week 1, it belongs to previous railway year
    if (d < weekOneStart) {
      railwayYear--;
      weekOneStart = RailwayDateAPI.getWeekOneStart(railwayYear);
    } else {
      // Check if we've rolled into next railway year
      const nextYearStart = RailwayDateAPI.getWeekOneStart(railwayYear + 1);
      if (d >= nextYearStart) {
        railwayYear++;
        weekOneStart = nextYearStart;
      }
    }
    
    // Calculate days since Week 1 start
    const daysDiff = Math.floor((d - weekOneStart) / (1000 * 60 * 60 * 24));
    
    // Rail week (1-indexed)
    const railWeek = Math.floor(daysDiff / 7) + 1;
    
    // Day of rail week (1=Sat, 7=Fri)
    const dayOfRailWeek = (daysDiff % 7) + 1;
    
    // Period (4 weeks each, 13 periods)
    const period = Math.ceil(railWeek / 4);
    
    // Week within period (1-4)
    const weekInPeriod = ((railWeek - 1) % 4) + 1;
    
    const totalWeeks = RailwayDateAPI.getTotalWeeks(railwayYear);
    
    return {
      railwayYear,
      railWeek,
      dayOfRailWeek,
      period,
      weekInPeriod,
      totalWeeks,
      weekOneStart,
      dayName: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayOfRailWeek - 1],
      railwayYearDisplay: `${railwayYear}/${(railwayYear + 1).toString().slice(-2)}`
    };
  },

  /**
   * Given a railway year and rail week number, return start (Saturday) and end (Friday) dates
   */
  railwayToDateRange: (railwayYear, railWeek) => {
    const weekOneStart = RailwayDateAPI.getWeekOneStart(railwayYear);
    const startDate = new Date(weekOneStart);
    startDate.setDate(startDate.getDate() + (railWeek - 1) * 7);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    return { startDate, endDate };
  },

  /**
   * Get period start and end dates for a railway year
   */
  getPeriodDates: (railwayYear, period) => {
    const startWeek = (period - 1) * 4 + 1;
    const endWeek = Math.min(period * 4, RailwayDateAPI.getTotalWeeks(railwayYear));
    
    const { startDate } = RailwayDateAPI.railwayToDateRange(railwayYear, startWeek);
    const { endDate } = RailwayDateAPI.railwayToDateRange(railwayYear, endWeek);
    
    return { startDate, endDate, startWeek, endWeek };
  },

  /**
   * Get UK Bank Holidays, Religious Events & Notable Dates for a given year
   */
  getUKBankHolidays: (year) => {
    const holidays = [];
    const easter = RailwayDateAPI.getEasterSunday(year);
    
    // Helper to add days to a date
    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };
    
    // Helper to get nth weekday of month (n=1 for first, n=-1 for last)
    const getNthWeekday = (year, month, weekday, n) => {
      if (n > 0) {
        const first = new Date(year, month, 1);
        const dayOffset = (weekday - first.getDay() + 7) % 7;
        return new Date(year, month, 1 + dayOffset + (n - 1) * 7);
      } else {
        const last = new Date(year, month + 1, 0);
        const dayOffset = (last.getDay() - weekday + 7) % 7;
        return new Date(year, month + 1, -dayOffset + (n + 1) * 7);
      }
    };
    
    // ========== UK BANK HOLIDAYS ==========
    
    // New Year's Day (substitute if weekend)
    let nyd = new Date(year, 0, 1);
    if (nyd.getDay() === 0) nyd = new Date(year, 0, 2);
    if (nyd.getDay() === 6) nyd = new Date(year, 0, 3);
    holidays.push({ date: nyd, name: "New Year's Day", emoji: "🎆", type: "bank" });
    
    // Good Friday
    holidays.push({ date: addDays(easter, -2), name: "Good Friday", emoji: "✝️", type: "bank" });
    
    // Easter Monday
    holidays.push({ date: addDays(easter, 1), name: "Easter Monday", emoji: "🐣", type: "bank" });
    
    // Early May Bank Holiday (first Monday of May)
    holidays.push({ date: getNthWeekday(year, 4, 1, 1), name: "Early May Bank Holiday", emoji: "🌷", type: "bank" });
    
    // Spring Bank Holiday (last Monday of May)
    holidays.push({ date: getNthWeekday(year, 4, 1, -1), name: "Spring Bank Holiday", emoji: "🌻", type: "bank" });
    
    // Summer Bank Holiday (last Monday of August)
    holidays.push({ date: getNthWeekday(year, 7, 1, -1), name: "Summer Bank Holiday", emoji: "☀️", type: "bank" });
    
    // Christmas Day (substitute if weekend)
    let xmas = new Date(year, 11, 25);
    const xmasDay = xmas.getDay();
    if (xmasDay === 0) xmas = new Date(year, 11, 27);
    if (xmasDay === 6) xmas = new Date(year, 11, 27);
    holidays.push({ date: xmas, name: "Christmas Day", emoji: "🎄", type: "bank" });
    
    // Boxing Day (substitute if weekend)
    let boxing = new Date(year, 11, 26);
    const boxingDay = boxing.getDay();
    if (boxingDay === 0) boxing = new Date(year, 11, 28);
    if (boxingDay === 6) boxing = new Date(year, 11, 28);
    holidays.push({ date: boxing, name: "Boxing Day", emoji: "🎁", type: "bank" });
    
    // ========== CHRISTIAN RELIGIOUS EVENTS ==========
    
    // Epiphany (6 Jan)
    holidays.push({ date: new Date(year, 0, 6), name: "Epiphany", emoji: "⭐", type: "religious" });
    
    // Shrove Tuesday / Pancake Day (47 days before Easter)
    holidays.push({ date: addDays(easter, -47), name: "Shrove Tuesday", emoji: "🥞", type: "religious" });
    
    // Ash Wednesday (46 days before Easter)
    holidays.push({ date: addDays(easter, -46), name: "Ash Wednesday", emoji: "✝️", type: "religious" });
    
    // Mothering Sunday (4th Sunday of Lent, 3 weeks before Easter)
    holidays.push({ date: addDays(easter, -21), name: "Mother's Day (UK)", emoji: "💐", type: "cultural" });
    
    // Palm Sunday (week before Easter)
    holidays.push({ date: addDays(easter, -7), name: "Palm Sunday", emoji: "🌿", type: "religious" });
    
    // Maundy Thursday
    holidays.push({ date: addDays(easter, -3), name: "Maundy Thursday", emoji: "✝️", type: "religious" });
    
    // Easter Sunday
    holidays.push({ date: easter, name: "Easter Sunday", emoji: "🐣", type: "religious" });
    
    // Ascension Day (39 days after Easter)
    holidays.push({ date: addDays(easter, 39), name: "Ascension Day", emoji: "☁️", type: "religious" });
    
    // Pentecost / Whit Sunday (49 days after Easter)
    holidays.push({ date: addDays(easter, 49), name: "Pentecost", emoji: "🕊️", type: "religious" });
    
    // Advent Sunday (4th Sunday before Christmas)
    const xmasDate = new Date(year, 11, 25);
    const xmasDayOfWeek = xmasDate.getDay();
    const daysToSunday = xmasDayOfWeek === 0 ? 0 : 7 - xmasDayOfWeek;
    const advent = new Date(year, 11, 25 - daysToSunday - 21);
    holidays.push({ date: advent, name: "Advent Sunday", emoji: "🕯️", type: "religious" });
    
    // Christmas Eve
    holidays.push({ date: new Date(year, 11, 24), name: "Christmas Eve", emoji: "🎄", type: "religious" });
    
    // ========== OTHER MAJOR RELIGIOUS EVENTS ==========
    
    // Approximate dates for major non-Christian holidays (these shift yearly)
    // Diwali (Oct/Nov - approximate, typically new moon in Kartik month)
    // Using a simple approximation - actual date varies
    const diwaliBase = new Date(year, 9, 15); // Mid-October base
    const diwaliOffset = (year - 2024) * 11 % 30; // Rough lunar cycle approximation
    holidays.push({ date: new Date(year, 9 + Math.floor((15 + diwaliOffset) / 30), (15 + diwaliOffset) % 30 || 15), name: "Diwali (approx)", emoji: "🪔", type: "religious" });
    
    // Hanukkah (varies - usually Dec, sometimes late Nov)
    holidays.push({ date: new Date(year, 11, 10), name: "Hanukkah (approx)", emoji: "🕎", type: "religious" });
    
    // Eid al-Fitr and Eid al-Adha shift ~11 days earlier each year
    // These are very approximate
    const eidFitrBase = new Date(2024, 3, 10); // April 10, 2024 was Eid al-Fitr
    const yearDiff = year - 2024;
    const eidShift = (yearDiff * 11) % 354;
    let eidFitr = new Date(eidFitrBase);
    eidFitr.setDate(eidFitr.getDate() - eidShift);
    if (eidFitr.getFullYear() !== year) {
      eidFitr = new Date(year, eidFitr.getMonth(), eidFitr.getDate());
    }
    holidays.push({ date: eidFitr, name: "Eid al-Fitr (approx)", emoji: "🌙", type: "religious" });
    
    // Eid al-Adha (~70 days after Eid al-Fitr)
    const eidAdha = addDays(eidFitr, 70);
    holidays.push({ date: eidAdha, name: "Eid al-Adha (approx)", emoji: "🌙", type: "religious" });
    
    // ========== CULTURAL & NATIONAL EVENTS ==========
    
    // Burns Night (25 Jan)
    holidays.push({ date: new Date(year, 0, 25), name: "Burns Night", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", type: "cultural" });
    
    // Valentine's Day (14 Feb)
    holidays.push({ date: new Date(year, 1, 14), name: "Valentine's Day", emoji: "💝", type: "cultural" });
    
    // St David's Day (1 Mar)
    holidays.push({ date: new Date(year, 2, 1), name: "St David's Day", emoji: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", type: "cultural" });
    
    // St Patrick's Day (17 Mar)
    holidays.push({ date: new Date(year, 2, 17), name: "St Patrick's Day", emoji: "☘️", type: "cultural" });
    
    // St George's Day (23 Apr)
    holidays.push({ date: new Date(year, 3, 23), name: "St George's Day", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", type: "cultural" });
    
    // Father's Day (3rd Sunday of June)
    holidays.push({ date: getNthWeekday(year, 5, 0, 3), name: "Father's Day", emoji: "👔", type: "cultural" });
    
    // Halloween (31 Oct)
    holidays.push({ date: new Date(year, 9, 31), name: "Halloween", emoji: "🎃", type: "cultural" });
    
    // Guy Fawkes Night (5 Nov)
    holidays.push({ date: new Date(year, 10, 5), name: "Bonfire Night", emoji: "🎆", type: "cultural" });
    
    // Remembrance Sunday (2nd Sunday of November)
    holidays.push({ date: getNthWeekday(year, 10, 0, 2), name: "Remembrance Sunday", emoji: "🌺", type: "cultural" });
    
    // Armistice Day (11 Nov)
    holidays.push({ date: new Date(year, 10, 11), name: "Armistice Day", emoji: "🎖️", type: "cultural" });
    
    // St Andrew's Day (30 Nov)
    holidays.push({ date: new Date(year, 10, 30), name: "St Andrew's Day", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", type: "cultural" });
    
    // New Year's Eve
    holidays.push({ date: new Date(year, 11, 31), name: "New Year's Eve", emoji: "🥂", type: "cultural" });
    
    return holidays;
  },

  /**
   * Calculate Easter Sunday using Anonymous Gregorian algorithm
   */
  getEasterSunday: (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }
};

// ============================================================================
// SEASON ARTWORK
// ============================================================================

const svgToDataUrl = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg);

const winterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" fill="none">
  <defs>
    <linearGradient id="winterGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1B3F"/>
      <stop offset="50%" stop-color="#0F325E"/>
      <stop offset="100%" stop-color="#174777"/>
    </linearGradient>
    <radialGradient id="winterGlow" cx="70%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#7CD4FF" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#7CD4FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="320" fill="url(#winterGradient)"/>
  <circle cx="640" cy="70" r="38" fill="white" fill-opacity="0.85"/>
  <circle cx="300" cy="180" r="180" fill="url(#winterGlow)" opacity="0.45"/>
  <path d="M0 210 Q160 170 300 210 T600 200 T900 230 L900 320 L0 320 Z" fill="#0A1935"/>
  <path d="M0 230 Q170 210 320 240 T620 230 T900 260 L900 320 L0 320 Z" fill="#0F2446"/>
  <g stroke="#BEE9FF" stroke-width="3" stroke-linecap="round" opacity="0.85">
    <path d="M150 70 l8 8 M150 78 l8 -8 M146 74 h16 M154 66 v16"/>
    <path d="M90 110 l6 6 M90 116 l6 -6 M87 112 h12 M93 106 v12"/>
    <path d="M480 50 l7 7 M480 57 l7 -7 M476 53 h14 M483 46 v14"/>
    <path d="M700 120 l7 7 M700 127 l7 -7 M696 123 h14 M703 116 v14"/>
    <path d="M360 90 l6 6 M360 96 l6 -6 M357 92 h12 M363 86 v12"/>
  </g>
  <g stroke="#E5F4FF" stroke-width="2" stroke-linecap="round" opacity="0.6">
    <path d="M200 140 h18 M230 150 h14 M260 132 h12 M720 80 h18 M760 112 h12"/>
    <path d="M420 110 h14 M450 128 h16 M520 90 h12 M560 140 h14"/>
    <path d="M620 60 h12 M660 96 h14 M300 120 h18"/>
  </g>
</svg>`;

const springSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" fill="none">
  <defs>
    <linearGradient id="springGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F3C2E"/>
      <stop offset="50%" stop-color="#1E7C4A"/>
      <stop offset="100%" stop-color="#37A06A"/>
    </linearGradient>
    <radialGradient id="springGlow" cx="30%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#9BF6A7" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#9BF6A7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="320" fill="url(#springGradient)"/>
  <circle cx="180" cy="80" r="42" fill="#FFEFA1" opacity="0.9"/>
  <circle cx="260" cy="170" r="180" fill="url(#springGlow)" opacity="0.35"/>
  <path d="M0 230 Q160 190 320 230 T640 220 T900 250 L900 320 L0 320 Z" fill="#0E2F24"/>
  <path d="M0 250 Q150 220 320 255 T620 245 T900 275 L900 320 L0 320 Z" fill="#134230"/>
  <path d="M120 230 Q140 190 160 230 T200 230" stroke="#7FE4A9" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M520 225 Q540 185 560 225 T600 225" stroke="#7FE4A9" stroke-width="5" stroke-linecap="round" fill="none"/>
  <g fill="#DFF9E3">
    <circle cx="200" cy="180" r="7"/><circle cx="215" cy="165" r="6"/><circle cx="230" cy="182" r="5"/>
    <circle cx="560" cy="195" r="7"/><circle cx="575" cy="180" r="6"/><circle cx="590" cy="198" r="5"/>
    <circle cx="340" cy="190" r="6"/><circle cx="355" cy="175" r="5"/><circle cx="370" cy="193" r="5"/>
  </g>
  <g stroke="#B3F4C9" stroke-width="2" opacity="0.8" stroke-linecap="round">
    <path d="M260 210 l-10 24 M260 210 l10 24"/>
    <path d="M600 205 l-10 24 M600 205 l10 24"/>
    <path d="M720 215 l-9 20 M720 215 l9 20"/>
  </g>
</svg>`;

const summerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" fill="none">
  <defs>
    <linearGradient id="summerGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1C2E5A"/>
      <stop offset="40%" stop-color="#27467A"/>
      <stop offset="100%" stop-color="#F5A623"/>
    </linearGradient>
    <radialGradient id="summerGlow" cx="75%" cy="25%" r="55%">
      <stop offset="0%" stop-color="#FFD876" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FFD876" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="320" fill="url(#summerGradient)"/>
  <circle cx="660" cy="80" r="70" fill="url(#summerGlow)"/>
  <path d="M0 240 Q200 210 400 240 T800 230 T900 250 L900 320 L0 320 Z" fill="#122341"/>
  <path d="M0 260 Q210 235 430 265 T840 255 T900 280 L900 320 L0 320 Z" fill="#1B3153"/>
  <g stroke="#FFE8A3" stroke-width="4" stroke-linecap="round" opacity="0.85">
    <path d="M660 10 v28"/>
    <path d="M660 150 v28"/>
    <path d="M580 80 h32"/>
    <path d="M708 80 h32"/>
    <path d="M600 32 l20 20"/>
    <path d="M700 32 l-20 20"/>
    <path d="M600 128 l20 -20"/>
    <path d="M700 128 l-20 -20"/>
  </g>
  <g stroke="#8FD4FF" stroke-width="3" stroke-linecap="round" opacity="0.7">
    <path d="M120 210 Q200 200 280 210" />
    <path d="M140 230 Q220 220 300 230" />
    <path d="M400 215 Q480 205 560 215" />
    <path d="M420 235 Q500 225 580 235" />
  </g>
</svg>`;

const autumnSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 320" fill="none">
  <defs>
    <linearGradient id="autumnGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2C1A1A"/>
      <stop offset="45%" stop-color="#4A2A1B"/>
      <stop offset="100%" stop-color="#C45D1E"/>
    </linearGradient>
    <radialGradient id="autumnGlow" cx="25%" cy="25%" r="55%">
      <stop offset="0%" stop-color="#FFB774" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#FFB774" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="320" fill="url(#autumnGradient)"/>
  <circle cx="200" cy="80" r="60" fill="url(#autumnGlow)"/>
  <path d="M0 235 Q170 210 340 235 T680 225 T900 255 L900 320 L0 320 Z" fill="#1F1414"/>
  <path d="M0 255 Q180 235 360 260 T700 245 T900 275 L900 320 L0 320 Z" fill="#2A1A15"/>
  <g fill="#F7C08A" opacity="0.8">
    <path d="M520 170 q18 -18 40 0 q-18 18 -40 0" />
    <path d="M600 140 q18 -18 36 0 q-18 18 -36 0" />
    <path d="M670 165 q16 -16 34 0 q-18 18 -34 0" />
    <path d="M750 135 q16 -16 34 0 q-18 18 -34 0" />
  </g>
  <g fill="#F2994A" opacity="0.8">
    <path d="M480 210 q-14 -34 12 -46 q26 12 12 46 q-14 34 -24 0" />
    <path d="M560 195 q-12 -30 11 -40 q23 10 11 40 q-12 30 -22 0" />
    <path d="M640 210 q-14 -32 12 -44 q26 12 12 44 q-14 32 -24 0" />
  </g>
  <g stroke="#F7C08A" stroke-width="3" stroke-linecap="round" opacity="0.7">
    <path d="M130 120 q20 10 30 0" />
    <path d="M160 150 q26 8 38 -2" />
    <path d="M110 180 q22 12 36 0" />
  </g>
</svg>`;

const seasonData = {
  winter: {
    name: 'Winter',
    emoji: '❄️',
    months: 'Dec — Feb',
    description: 'Frosty mornings and long blue evenings over the network.',
    badge: 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30',
    image: svgToDataUrl(winterSvg)
  },
  spring: {
    name: 'Spring',
    emoji: '🌱',
    months: 'Mar — May',
    description: 'Bright greens, longer days, and blossoms by the sidings.',
    badge: 'bg-emerald-500/15 text-emerald-100 border border-emerald-400/30',
    image: svgToDataUrl(springSvg)
  },
  summer: {
    name: 'Summer',
    emoji: '☀️',
    months: 'Jun — Aug',
    description: 'Warm sunsets, bright skies, and long light evenings on the rails.',
    badge: 'bg-amber-500/20 text-amber-100 border border-amber-400/30',
    image: svgToDataUrl(summerSvg)
  },
  autumn: {
    name: 'Autumn',
    emoji: '🍂',
    months: 'Sep — Nov',
    description: 'Copper light, crisp air, and falling leaves along the line.',
    badge: 'bg-orange-500/20 text-orange-100 border border-orange-400/30',
    image: svgToDataUrl(autumnSvg)
  }
};

const getSeasonInfo = (date) => {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return seasonData.spring;
  if (month >= 5 && month <= 7) return seasonData.summer;
  if (month >= 8 && month <= 10) return seasonData.autumn;
  return seasonData.winter;
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const RailwayCalendar = () => {
  const normalizeDate = (value) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [animating, setAnimating] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const [selectedDate, setSelectedDate] = useState(() => normalizeDate(new Date()));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayInfo = RailwayDateAPI.dateToRailway(today);
  const selectedSeasonInfo = useMemo(() => getSeasonInfo(selectedDate), [selectedDate]);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  
  // Tooltip handlers
  const showTooltip = (e, content) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };
  
  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false, content: '' }));
  };
  
  // Clear tooltip when view mode changes
  useEffect(() => {
    hideTooltip();
  }, [viewMode, currentDate]);
  
  // Navigate to specific day in week view
  const goToDay = (date) => {
    const normalized = normalizeDate(date);
    setSelectedDate(normalized);
    animateTransition(() => {
      setCurrentDate(new Date(normalized));
      setViewMode('week');
    });
  };
  
  // Animation helper
  const animateTransition = useCallback((callback) => {
    setAnimating(true);
    setTimeout(() => {
      callback();
      setTimeout(() => setAnimating(false), 50);
    }, 150);
  }, []);
  
  // Navigation functions
  const navigateWeek = (delta) => {
    animateTransition(() => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + delta * 7);
      setCurrentDate(newDate);
    });
  };
  
  const navigateMonth = (delta) => {
    animateTransition(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    });
  };
  
  const navigateYear = (delta) => {
    animateTransition(() => {
      setCurrentDate(new Date(currentDate.getFullYear() + delta, currentDate.getMonth(), 1));
    });
  };
  
  const goToToday = () => {
    const todayDate = normalizeDate(new Date());
    setSelectedDate(todayDate);
    animateTransition(() => setCurrentDate(new Date(todayDate)));
  };
  
  const jumpToRailwayWeek = (railwayYear, week) => {
    animateTransition(() => {
      const { startDate } = RailwayDateAPI.railwayToDateRange(railwayYear, week);
      setCurrentDate(startDate);
      setViewMode('week');
    });
  };
  
  // Get current railway info
  const currentInfo = useMemo(() => RailwayDateAPI.dateToRailway(currentDate), [currentDate]);
  
  // Get holidays for current view
  const holidays = useMemo(() => {
    const year = currentDate.getFullYear();
    return [
      ...RailwayDateAPI.getUKBankHolidays(year),
      ...RailwayDateAPI.getUKBankHolidays(year + 1)
    ];
  }, [currentDate]);
  
  const isHoliday = (date) => {
    return holidays.find(h => h.date.toDateString() === date.toDateString());
  };
  
  const isToday = (date) => date.toDateString() === today.toDateString();
  
  // Period colors
  const getPeriodColor = (period) => {
    const colors = [
      { bg: 'from-cyan-500/20 to-cyan-600/20', border: 'border-cyan-400/50', text: 'text-cyan-400' },
      { bg: 'from-magenta-500/20 to-pink-600/20', border: 'border-pink-400/50', text: 'text-pink-400' },
      { bg: 'from-amber-500/20 to-orange-600/20', border: 'border-amber-400/50', text: 'text-amber-400' },
      { bg: 'from-emerald-500/20 to-teal-600/20', border: 'border-emerald-400/50', text: 'text-emerald-400' },
      { bg: 'from-violet-500/20 to-purple-600/20', border: 'border-violet-400/50', text: 'text-violet-400' },
      { bg: 'from-rose-500/20 to-red-600/20', border: 'border-rose-400/50', text: 'text-rose-400' },
      { bg: 'from-sky-500/20 to-blue-600/20', border: 'border-sky-400/50', text: 'text-sky-400' },
      { bg: 'from-lime-500/20 to-green-600/20', border: 'border-lime-400/50', text: 'text-lime-400' },
      { bg: 'from-fuchsia-500/20 to-pink-600/20', border: 'border-fuchsia-400/50', text: 'text-fuchsia-400' },
      { bg: 'from-yellow-500/20 to-amber-600/20', border: 'border-yellow-400/50', text: 'text-yellow-400' },
      { bg: 'from-teal-500/20 to-cyan-600/20', border: 'border-teal-400/50', text: 'text-teal-400' },
      { bg: 'from-indigo-500/20 to-violet-600/20', border: 'border-indigo-400/50', text: 'text-indigo-400' },
      { bg: 'from-orange-500/20 to-red-600/20', border: 'border-orange-400/50', text: 'text-orange-400' },
    ];
    return colors[(period - 1) % colors.length];
  };

  // ============================================================================
  // WEEK VIEW
  // ============================================================================
  
  const WeekView = () => {
    const weekStart = new Date(currentDate);
    const dayOfWeek = weekStart.getDay();
    const daysToSaturday = (dayOfWeek + 1) % 7;
    weekStart.setDate(weekStart.getDate() - daysToSaturday);
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return { 
        date: d, 
        info: RailwayDateAPI.dateToRailway(d), 
        holiday: isHoliday(d),
        moon: RailwayDateAPI.getMoonPhase(d),
        dayLight: RailwayDateAPI.getDayLength(d),
        isPayday: RailwayDateAPI.isPayday(d)
      };
    });
    
    const weekInfo = weekDays[0].info;
    const periodColor = getPeriodColor(weekInfo.period);
    
    // Get all events for this week
    const weekEvents = weekDays
      .filter(d => d.holiday)
      .map(d => d.holiday);
    
    // Get unique events (in case of duplicates)
    const uniqueEvents = weekEvents.filter((event, index, self) =>
      index === self.findIndex(e => e.name === event.name)
    );
    
    return (
      <div className={`transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Week Header */}
        <div className={`mb-6 p-6 rounded-2xl bg-gradient-to-r ${periodColor.bg} backdrop-blur-xl border ${periodColor.border}`}>
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Train className={`${periodColor.text}`} size={28} />
                <h2 className="text-2xl font-bold text-white">
                  Week {weekInfo.railWeek} <span className="text-white/60">of {weekInfo.totalWeeks}</span>
                </h2>
              </div>
              <p className="text-white/70 mb-1">
                Railway Year {weekInfo.railwayYearDisplay} • Period {weekInfo.period} • Week {weekInfo.weekInPeriod} of 4
              </p>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <span className="uppercase tracking-wider">Date Range</span>
                <span className="text-white font-medium">
                  {weekDays[0].date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {weekDays[6].date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            
            {/* Events This Week */}
            {uniqueEvents.length > 0 && (
              <div className="xl:max-w-md">
                <div className="text-white/50 text-xs uppercase tracking-wider mb-2">Events This Week</div>
                <div className="flex flex-wrap gap-2">
                  {uniqueEvents.map((event, idx) => {
                    // Find the day this event occurs
                    const eventDay = weekDays.find(d => d.holiday && d.holiday.name === event.name);
                    return (
                      <button 
                        key={idx}
                        onClick={() => eventDay && goToDay(eventDay.date)}
                        onMouseEnter={(e) => showTooltip(e, `${event.emoji} ${event.name} — ${eventDay?.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`)}
                        onMouseLeave={hideTooltip}
                        className={`px-3 py-1.5 rounded-xl backdrop-blur-sm flex items-center gap-2 text-sm cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                          event.type === 'bank' 
                            ? 'bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30 hover:border-amber-400/50'
                            : event.type === 'religious'
                              ? 'bg-violet-500/20 border border-violet-400/30 text-violet-200 hover:bg-violet-500/30 hover:border-violet-400/50'
                              : 'bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30 hover:border-cyan-400/50'
                        }`}
                      >
                        <span className="text-lg">{event.emoji}</span>
                        <span className="font-medium truncate max-w-[150px]">{event.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Daylight Summary Panel */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Sun size={16} className="text-amber-400" />
                <span className="text-white/50 text-xs uppercase tracking-wider">Daylight</span>
              </div>
              
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/20">
                <Sunrise size={14} className="text-orange-400" />
                <span className="text-white/70 text-sm">{weekDays[0].dayLight.sunrise}</span>
                <span className="text-white/30">→</span>
                <Sunset size={14} className="text-pink-400" />
                <span className="text-white/70 text-sm">{weekDays[0].dayLight.sunset}</span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20">
                <span className="text-white/70 text-sm">{weekDays[0].dayLight.dayLengthFormatted}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${weekDays[0].dayLight.daysGettingLonger ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {weekDays[0].dayLight.daysGettingLonger ? '↑' : '↓'} {weekDays[0].dayLight.changeMinutes}m/day
                </span>
              </div>
              
              <div 
                className="flex-1 min-w-[100px] max-w-[200px] h-2 bg-slate-700 rounded-full overflow-hidden"
                onMouseEnter={(e) => showTooltip(e, `${weekDays[0].dayLight.dayLengthPercent}% of maximum daylight`)}
                onMouseLeave={hideTooltip}
              >
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-full"
                  style={{ width: `${weekDays[0].dayLight.dayLengthPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Rail Track Timeline */}
        <div className="relative mb-8">
          {/* Track line */}
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-full transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/50 via-amber-500/50 to-magenta-500/50 rounded-full transform -translate-y-1/2 blur-sm"></div>
          
          {/* Day segments */}
          <div className="relative grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center">
                {/* Station marker */}
                <div className={`w-6 h-6 rounded-full border-4 ${
                  selectedDate && selectedDate.toDateString() === day.date.toDateString()
                    ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                    : ''
                } ${
                  isToday(day.date) 
                    ? 'bg-cyan-400 border-cyan-300 shadow-lg shadow-cyan-500/50 animate-pulse' 
                    : day.isPayday
                      ? 'bg-amber-400 border-yellow-300 shadow-lg shadow-amber-500/50'
                    : day.holiday 
                      ? 'bg-rose-400 border-rose-300 shadow-lg shadow-rose-500/30'
                      : 'bg-slate-600 border-slate-500'
                }`}></div>
                
                {/* Day card */}
                <div
                  onClick={() => setSelectedDate(normalizeDate(day.date))}
                  className={`mt-4 w-full p-4 rounded-xl backdrop-blur-xl border transition-all hover:scale-105 cursor-pointer ${
                  selectedDate && selectedDate.toDateString() === day.date.toDateString()
                    ? 'outline outline-2 outline-indigo-400/70'
                    : ''
                  } ${
                  isToday(day.date)
                    ? 'bg-cyan-500/20 border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                    : day.isPayday
                      ? 'bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-amber-600/30 border-amber-400/60 shadow-lg shadow-amber-500/30 relative overflow-hidden'
                    : day.holiday
                      ? 'bg-rose-500/20 border-rose-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}>
                  <div className="text-center">
                    {/* Payday sparkle effect */}
                    {day.isPayday && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
                        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-amber-200 rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2s' }}></div>
                        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '2s' }}></div>
                      </div>
                    )}
                    
                    <div className={`text-xs uppercase tracking-wider mb-1 ${
                      isToday(day.date) ? 'text-cyan-400' : day.isPayday ? 'text-amber-400' : 'text-white/50'
                    }`}>
                      {dayNames[idx]}
                    </div>
                    <div className={`text-2xl font-bold ${
                      isToday(day.date) ? 'text-cyan-300' : day.isPayday ? 'text-amber-300' : 'text-white'
                    }`}>
                      {day.date.getDate()}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {monthNames[day.date.getMonth()].slice(0, 3)}
                    </div>
                    
                    {/* Payday Indicator */}
                    {day.isPayday && (
                      <div 
                        className="mt-3 cursor-default"
                        onMouseEnter={(e) => showTooltip(e, '💰 PAYDAY! 💰')}
                        onMouseLeave={hideTooltip}
                      >
                        <div className="relative inline-block animate-bounce">
                          <span className="text-3xl">💰</span>
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Moon Phase */}
                    {!day.isPayday && (
                      <div 
                        className="mt-2 cursor-default"
                        onMouseEnter={(e) => showTooltip(e, `${day.moon.emoji} ${day.moon.name} (${day.moon.illumination}% illuminated)`)}
                        onMouseLeave={hideTooltip}
                      >
                        <span className={`text-xl ${day.moon.isSignificant ? 'opacity-100' : 'opacity-50'}`}>
                          {day.moon.emoji}
                        </span>
                      </div>
                    )}
                    
                    {/* Day Length */}
                    {!day.isPayday && (
                      <div 
                        className="mt-2 cursor-default"
                        onMouseEnter={(e) => showTooltip(e, `☀️ ${day.dayLight.dayLengthFormatted} daylight\n🌅 Sunrise: ${day.dayLight.sunrise}\n🌇 Sunset: ${day.dayLight.sunset}\n${day.dayLight.daysGettingLonger ? '📈' : '📉'} ${day.dayLight.changeFormatted}/day`)}
                        onMouseLeave={hideTooltip}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Sun size={12} className="text-amber-400" />
                          <span className="text-[10px] text-amber-300/80">{day.dayLight.dayLengthFormatted}</span>
                        </div>
                        <div className="mt-1 h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                            style={{ width: `${day.dayLight.dayLengthPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {day.holiday && !day.isPayday && (
                      <button
                        onClick={() => goToDay(day.date)}
                        onMouseEnter={(e) => showTooltip(e, `${day.holiday.emoji} ${day.holiday.name}`)}
                        onMouseLeave={hideTooltip}
                        className="mt-2 px-2 py-1 bg-rose-500/30 hover:bg-rose-500/40 rounded-md text-xs text-rose-300 truncate flex items-center gap-1 justify-center w-full cursor-pointer transition-all hover:scale-105"
                      >
                        <span>{day.holiday.emoji}</span>
                        <span className="truncate">{day.holiday.name.split(' ')[0]}</span>
                      </button>
                    )}
                    {isToday(day.date) && !day.isPayday && (
                      <div className="mt-2 px-2 py-1 bg-cyan-500/30 rounded-md text-xs text-cyan-300">
                        TODAY
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Week Navigation Scrubber */}
        <div className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <span className="text-white/50 text-sm">Quick Jump to Week</span>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-400/30"></div>
                <span className="text-amber-300/70">Bank Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-violet-500/30 border border-violet-400/30"></div>
                <span className="text-violet-300/70">Religious</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-400/30"></div>
                <span className="text-cyan-300/70">Cultural</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {Array.from({ length: Math.min(weekInfo.totalWeeks, 52) }, (_, i) => i + 1).map(w => {
              const wPeriod = Math.ceil(w / 4);
              const pColor = getPeriodColor(wPeriod);
              return (
                <button
                  key={w}
                  onClick={() => jumpToRailwayWeek(weekInfo.railwayYear, w)}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    w === weekInfo.railWeek
                      ? `bg-gradient-to-b ${pColor.bg} ${pColor.border} border-2 ${pColor.text}`
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MONTH VIEW
  // ============================================================================
  
  const MonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Saturday before or on first day
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - ((dayOfWeek + 1) % 7));
    
    // Generate 6 weeks of days
    const weeks = [];
    const current = new Date(startDate);
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push({
          date: new Date(current),
          info: RailwayDateAPI.dateToRailway(current),
          isCurrentMonth: current.getMonth() === month,
          holiday: isHoliday(current),
          moon: RailwayDateAPI.getMoonPhase(current),
          dayLight: RailwayDateAPI.getDayLength(current),
          isPayday: RailwayDateAPI.isPayday(current)
        });
        current.setDate(current.getDate() + 1);
      }
      // Only add week if it contains at least one day from current month
      if (week.some(d => d.isCurrentMonth)) {
        weeks.push(week);
      }
    }
    
    return (
      <div className={`transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-9 bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-white/10">
            <div className="p-3 text-center text-cyan-400 text-xs font-medium uppercase tracking-wider">Week</div>
            <div className="p-3 text-center text-amber-400 text-xs font-medium uppercase tracking-wider">Period</div>
            {dayNames.map((day, i) => (
              <div key={day} className="p-3 text-center text-white/60 text-xs font-medium uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          {weeks.map((week, wi) => {
            const weekInfo = week[0].info;
            const periodColor = getPeriodColor(weekInfo.period);
            const isFirstWeekOfPeriod = weekInfo.weekInPeriod === 1;
            
            return (
              <div key={wi} className="grid grid-cols-9 border-b border-white/5 last:border-0">
                {/* Week Number */}
                <button 
                  onClick={() => jumpToRailwayWeek(weekInfo.railwayYear, weekInfo.railWeek)}
                  onMouseEnter={(e) => showTooltip(e, `Go to Week ${weekInfo.railWeek}`)}
                  onMouseLeave={hideTooltip}
                  className={`p-2 flex items-center justify-center bg-gradient-to-r ${periodColor.bg} border-r border-white/10 cursor-pointer hover:brightness-125 transition-all`}
                >
                  <span className={`px-2 py-1 rounded-lg bg-black/30 ${periodColor.text} font-bold text-sm`}>
                    W{weekInfo.railWeek}
                  </span>
                </button>
                
                {/* Period */}
                <div className={`p-2 flex items-center justify-center bg-gradient-to-r ${periodColor.bg} border-r border-white/10 ${
                  isFirstWeekOfPeriod ? 'border-t-2 ' + periodColor.border : ''
                }`}>
                  {isFirstWeekOfPeriod && (
                    <span className={`px-2 py-1 rounded-lg bg-black/30 ${periodColor.text} font-bold text-sm`}>
                      P{weekInfo.period}
                    </span>
                  )}
                </div>
                
                {/* Days */}
                {week.map((day, di) => {
                  const isSelected = selectedDate && selectedDate.toDateString() === day.date.toDateString();
                  return (
                    <div
                      key={di}
                      onClick={() => goToDay(day.date)}
                      onMouseEnter={(e) => showTooltip(e, `${day.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}\n${day.isPayday ? '💰 PAYDAY! 💰' : day.moon.emoji + ' ' + day.moon.name}\n☀️ ${day.dayLight.dayLengthFormatted} (${day.dayLight.sunrise}–${day.dayLight.sunset})`)}
                      onMouseLeave={hideTooltip}
                      className={`group p-1.5 min-h-[75px] transition-all border-r border-white/5 last:border-0 cursor-pointer ${
                        day.isCurrentMonth ? 'bg-white/[0.02]' : ''
                      } ${isToday(day.date) ? 'ring-2 ring-inset ring-cyan-400' : ''} ${day.isPayday ? 'ring-2 ring-inset ring-amber-400' : ''} ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : ''} hover:bg-white/10 active:bg-white/15`}
                    >
                      <div className="flex flex-col h-full relative">
                        {/* Payday sparkle background */}
                        {day.isPayday && day.isCurrentMonth && (
                          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                            <div className="absolute top-1 left-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                            <div className="absolute top-2 right-2 w-0.5 h-0.5 bg-amber-200 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '3s' }}></div>
                            <div className="absolute bottom-1 left-3 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '2s', animationDuration: '3s' }}></div>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between">
                          <div className={`text-sm font-medium ${
                            isToday(day.date) 
                              ? 'text-cyan-300' 
                              : day.isPayday && day.isCurrentMonth
                                ? 'text-amber-300'
                              : day.isCurrentMonth 
                                ? 'text-white' 
                                : 'text-white/30'
                          }`}>
                            {day.date.getDate()}
                          </div>
                          {/* Icon - Payday or Moon Phase */}
                          {day.isPayday && day.isCurrentMonth ? (
                            <span 
                              className="text-base animate-pulse"
                              onMouseEnter={(e) => { e.stopPropagation(); showTooltip(e, '💰 PAYDAY! 💰'); }}
                              onMouseLeave={hideTooltip}
                            >
                              💰
                            </span>
                          ) : (
                            <span 
                              className={`text-xs ${day.isCurrentMonth ? (day.moon.isSignificant ? 'opacity-90' : 'opacity-40') : 'opacity-20'}`}
                              onMouseEnter={(e) => { e.stopPropagation(); showTooltip(e, `${day.moon.emoji} ${day.moon.name} (${day.moon.illumination}%)`); }}
                              onMouseLeave={hideTooltip}
                            >
                              {day.moon.emoji}
                            </span>
                          )}
                        </div>
                        
                        {/* Day Length Bar */}
                        {!day.isPayday && (
                          <div 
                            className={`mt-1 h-1 w-full rounded-full overflow-hidden ${day.isCurrentMonth ? 'bg-slate-700' : 'bg-slate-800'}`}
                            onMouseEnter={(e) => { e.stopPropagation(); showTooltip(e, `☀️ ${day.dayLight.dayLengthFormatted}\n🌅 ${day.dayLight.sunrise} → 🌇 ${day.dayLight.sunset}`); }}
                            onMouseLeave={hideTooltip}
                          >
                            <div 
                              className={`h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full ${day.isCurrentMonth ? 'opacity-70' : 'opacity-30'}`}
                              style={{ width: `${day.dayLight.dayLengthPercent}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {day.holiday && !day.isPayday && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); goToDay(day.date); }}
                            onMouseEnter={(e) => { e.stopPropagation(); showTooltip(e, `${day.holiday.emoji} ${day.holiday.name}`); }}
                            onMouseLeave={hideTooltip}
                            className="mt-1 text-[10px] text-rose-400 truncate flex items-center gap-0.5 hover:text-rose-300 cursor-pointer transition-all hover:scale-105 w-full"
                          >
                            <span>{day.holiday.emoji}</span>
                            <span className="truncate">{day.holiday.name.split(' ')[0]}</span>
                          </button>
                        )}
                        {isToday(day.date) && !day.isPayday && (
                          <div className="mt-auto">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300">
                              TODAY
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // YEAR VIEW
  // ============================================================================
  
  const YearView = () => {
    const railwayYear = currentInfo.railwayYear;
    const totalWeeks = RailwayDateAPI.getTotalWeeks(railwayYear);
    const periods = Math.ceil(totalWeeks / 4);
    
    return (
      <div className={`transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {/* Railway Year Header */}
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-violet-500/20 to-purple-600/20 backdrop-blur-xl border border-violet-400/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Railway Year {railwayYear}/{(railwayYear + 1).toString().slice(-2)}
              </h2>
              <p className="text-white/60">
                {RailwayDateAPI.getWeekOneStart(railwayYear).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} — {
                  (() => {
                    const end = new Date(RailwayDateAPI.getWeekOneStart(railwayYear + 1));
                    end.setDate(end.getDate() - 1);
                    return end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                  })()
                }
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center px-4 py-2 rounded-xl bg-white/10">
                <div className="text-2xl font-bold text-violet-300">{totalWeeks}</div>
                <div className="text-xs text-white/50">Weeks</div>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-white/10">
                <div className="text-2xl font-bold text-violet-300">{periods}</div>
                <div className="text-xs text-white/50">Periods</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Periods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: periods }, (_, p) => {
            const period = p + 1;
            const periodColor = getPeriodColor(period);
            const { startDate, endDate, startWeek, endWeek } = RailwayDateAPI.getPeriodDates(railwayYear, period);
            const weeksInPeriod = endWeek - startWeek + 1;
            
            return (
              <div
                key={period}
                className={`rounded-2xl bg-gradient-to-br ${periodColor.bg} backdrop-blur-xl border ${periodColor.border} overflow-hidden cursor-pointer hover:scale-[1.02] transition-all`}
                onClick={() => {
                  jumpToRailwayWeek(railwayYear, startWeek);
                  setViewMode('week');
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-xl font-bold ${periodColor.text}`}>Period {period}</h3>
                    <span className="text-white/40 text-sm">{weeksInPeriod} weeks</span>
                  </div>
                  
                  <div className="text-white/60 text-sm mb-4">
                    {startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                  
                  {/* Week indicators */}
                  <div className="flex gap-1">
                    {Array.from({ length: weeksInPeriod }, (_, w) => {
                      const weekNum = startWeek + w;
                      const isCurrentWeek = weekNum === todayInfo.railWeek && railwayYear === todayInfo.railwayYear;
                      return (
                        <div
                          key={w}
                          className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                            isCurrentWeek
                              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {weekNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-magenta-500/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Train size={24} />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-amber-400 bg-clip-text text-transparent">
                  Railway Calendar
                </h1>
              </div>
              <p className="text-white/50">Network Rail Week Number System</p>
            </div>
            
            {/* Today's Info Cards */}
            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 backdrop-blur">
                <div className="text-cyan-400/70 text-xs uppercase tracking-wider">Rail Week</div>
                <div className="text-cyan-300 font-bold text-xl">W{todayInfo.railWeek}</div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur">
                <div className="text-amber-400/70 text-xs uppercase tracking-wider">Period</div>
                <div className="text-amber-300 font-bold text-xl">P{todayInfo.period}</div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 backdrop-blur">
                <div className="text-violet-400/70 text-xs uppercase tracking-wider">Railway Year</div>
                <div className="text-violet-300 font-bold text-xl">{todayInfo.railwayYearDisplay}</div>
              </div>
            </div>
          </div>

          {/* Seasonal artwork */}
          <div className="mt-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-xl">
              <img
                src={selectedSeasonInfo.image}
                alt={`${selectedSeasonInfo.name} illustration`}
                className="w-full h-44 md:h-56 object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-black/60"></div>
              <div className="absolute inset-0 p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur ${selectedSeasonInfo.badge}`}>
                    <span className="text-lg">{selectedSeasonInfo.emoji}</span>
                    <span>{selectedSeasonInfo.name}</span>
                  </div>
                  <div className="text-xl md:text-2xl font-semibold text-white mt-2">Seasonal view</div>
                  <p className="text-white/70 text-sm max-w-2xl">{selectedSeasonInfo.description}</p>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur min-w-[200px] flex flex-col gap-1.5">
                  <div className="text-white/60 text-xs uppercase tracking-wider">Selected Day</div>
                  <div className="text-white font-semibold">
                    {selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-white/60 text-xs uppercase tracking-wider mt-2">Season Window</div>
                  <div className="text-white font-semibold">{selectedSeasonInfo.months}</div>
                  <div className="text-white/60 text-xs mt-1">Updates when you select a day</div>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="mt-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm text-white transition-all"
                  >
                    Select today
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Controls Bar */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* View Mode Switcher */}
            <div className="flex p-1 rounded-xl bg-black/30 border border-white/10 shadow-inner">
              {[
                { id: 'week', label: 'Week', icon: Clock },
                { id: 'month', label: 'Month', icon: Calendar },
                { id: 'year', label: 'Year', icon: Layers }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                    viewMode === mode.id
                      ? 'bg-gradient-to-b from-cyan-400/20 to-violet-500/20 text-white shadow-lg shadow-cyan-500/10 border border-cyan-400/30'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <mode.icon size={16} className={viewMode === mode.id ? 'text-cyan-400' : ''} />
                  <span className="font-medium">{mode.label}</span>
                </button>
              ))}
            </div>
            
            {/* Navigation - Elegant Control Panel */}
            <div className="flex items-center gap-3">
              {/* Backward Navigation Group */}
              <div className="flex items-center rounded-xl bg-black/30 border border-white/10 overflow-hidden shadow-inner">
                {/* Year back */}
                <button 
                  onClick={() => navigateYear(-1)} 
                  className="group relative px-3 py-2.5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 border-r border-white/10"
                  title="Previous Year"
                >
                  <div className="flex items-center gap-0.5">
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    <ChevronLeft size={14} className="-ml-2 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/0 group-hover:text-white/50 transition-all whitespace-nowrap">Year</span>
                </button>
                
                {/* Month back */}
                {viewMode !== 'year' && (
                  <button 
                    onClick={() => navigateMonth(-1)} 
                    className="group relative px-3 py-2.5 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 border-r border-white/10"
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/0 group-hover:text-cyan-400/70 transition-all whitespace-nowrap">Month</span>
                  </button>
                )}
                
                {/* Week back */}
                {viewMode === 'week' && (
                  <button 
                    onClick={() => navigateWeek(-1)} 
                    className="group relative px-3 py-2.5 text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
                    title="Previous Week"
                  >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/0 group-hover:text-amber-400/70 transition-all whitespace-nowrap">Week</span>
                  </button>
                )}
              </div>
              
              {/* Today Button - Center Focal Point */}
              <button
                onClick={goToToday}
                className="group relative px-6 py-2.5 rounded-xl bg-gradient-to-b from-cyan-500/20 via-violet-500/15 to-violet-600/20 border border-cyan-400/30 text-white font-medium transition-all duration-300 hover:from-cyan-500/30 hover:via-violet-500/25 hover:to-violet-600/30 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50"></div>
                  Today
                </span>
              </button>
              
              {/* Forward Navigation Group */}
              <div className="flex items-center rounded-xl bg-black/30 border border-white/10 overflow-hidden shadow-inner">
                {/* Week forward */}
                {viewMode === 'week' && (
                  <button 
                    onClick={() => navigateWeek(1)} 
                    className="group relative px-3 py-2.5 text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200 border-r border-white/10"
                    title="Next Week"
                  >
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/0 group-hover:text-amber-400/70 transition-all whitespace-nowrap">Week</span>
                  </button>
                )}
                
                {/* Month forward */}
                {viewMode !== 'year' && (
                  <button 
                    onClick={() => navigateMonth(1)} 
                    className="group relative px-3 py-2.5 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 border-r border-white/10"
                    title="Next Month"
                  >
                    <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/0 group-hover:text-cyan-400/70 transition-all whitespace-nowrap">Month</span>
                  </button>
                )}
                
                {/* Year forward */}
                <button 
                  onClick={() => navigateYear(1)} 
                  className="group relative px-3 py-2.5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                  title="Next Year"
                >
                  <div className="flex items-center gap-0.5">
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    <ChevronRight size={14} className="-ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/0 group-hover:text-white/50 transition-all whitespace-nowrap">Year</span>
                </button>
              </div>
            </div>
            
            {/* Current Date Display */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/20 border border-white/5">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-violet-500"></div>
              <div>
                <div className="text-white/40 text-xs uppercase tracking-wider">Viewing</div>
                <div className="text-lg font-semibold text-white">
                  {viewMode === 'week' && `Week ${currentInfo.railWeek}, ${currentInfo.railwayYearDisplay}`}
                  {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                  {viewMode === 'year' && `RY ${currentInfo.railwayYearDisplay}`}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main View */}
        <main onMouseLeave={hideTooltip}>
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'month' && <MonthView />}
          {viewMode === 'year' && <YearView />}
        </main>
        
        <footer className="mt-8 pt-6 border-t border-white/10">
          <div className="text-white/40 text-sm text-center sm:text-left">
            Week 1 starts on first Saturday on or after 1 April • Weeks run Saturday–Friday • 4 weeks per period
          </div>
        </footer>
      </div>

      {/* Tooltip */}
      <div 
        className={`fixed z-50 pointer-events-none transition-all duration-150 ${
          tooltip.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
        style={{ 
          left: tooltip.x || 0, 
          top: tooltip.y || 0,
          transform: `translate(-50%, -100%) translateY(${tooltip.visible ? 0 : 4}px)`,
          visibility: tooltip.content ? 'visible' : 'hidden'
        }}
      >
        <div className="px-3 py-2 rounded-lg bg-slate-800 border border-white/20 shadow-xl backdrop-blur-xl">
          <div className="text-white text-sm font-medium whitespace-pre-line">{tooltip.content}</div>
        </div>
        <div className="w-3 h-3 bg-slate-800 border-r border-b border-white/20 rotate-45 mx-auto -mt-1.5"></div>
      </div>
    </div>
  );
};

// Make component available globally for browser usage
// export default RailwayCalendar; // Commented for browser compatibility
window.RailwayCalendar = RailwayCalendar;
