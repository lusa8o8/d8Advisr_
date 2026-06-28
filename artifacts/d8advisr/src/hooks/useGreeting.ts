import { useState, useEffect } from 'react';

/**
 * Returns a region-aware greeting and time context.
 * @param timezone - The timezone string of the region (e.g. 'Africa/Lusaka')
 */
export function useGreeting(timezone?: string) {
  const [greeting, setGreeting] = useState('Good evening');
  const [dayContext, setDayContext] = useState('EVENING');

  useEffect(() => {
    const calculateTime = () => {
      try {
        // Fallback to local if no timezone provided
        const options: Intl.DateTimeFormatOptions = {
          hour: 'numeric',
          weekday: 'long',
          hour12: false,
          timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(new Date());
        
        const hourString = parts.find(p => p.type === 'hour')?.value || '18';
        const weekdayString = parts.find(p => p.type === 'weekday')?.value || 'THURSDAY';
        
        // Handle 24-hour edge cases (24 == 0)
        let hour = parseInt(hourString, 10);
        if (hour === 24) hour = 0;
        
        let greetingText = 'Good evening';
        let contextText = 'EVENING';

        if (hour >= 5 && hour < 12) {
          greetingText = 'Good morning';
          contextText = 'MORNING';
        } else if (hour >= 12 && hour < 17) {
          greetingText = 'Good afternoon';
          contextText = 'AFTERNOON';
        } else if (hour >= 17 && hour < 22) {
          greetingText = 'Good evening';
          contextText = 'EVENING';
        } else {
          greetingText = 'Good night';
          contextText = 'NIGHT';
        }

        setGreeting(greetingText);
        setDayContext(`${weekdayString.toUpperCase()} ${contextText}`);
      } catch (err) {
        // Fallback in case of invalid timezone strings
        setGreeting('Good evening');
        setDayContext('EVENING');
      }
    };

    calculateTime();
    // Update every minute to catch hour rollovers
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [timezone]);

  return { greeting, dayContext };
}
