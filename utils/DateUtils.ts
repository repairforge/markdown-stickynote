export class DateUtils {
    /**
     * Formats a date as YYYY-MM-DD.
     * @param date The date to format.
     * @returns A string representing the formatted date.
     */
    static formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Formats a time as HH-MM-SS.
     * @param date The date to format.
     * @returns A string representing the formatted time.
     */
    static formatTime(date: Date): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Formats a date and time as YYYY-MM-DD HH:MM:SS.
     * @param date The date to format.
     * @returns A string representing the formatted date and time.
     */
    static formatDateTime(date: Date): string {
        const dateStr = this.formatDate(date);
        const timeStr = this.formatTime(date);
        return `${dateStr} ${timeStr}`;
    }

    /**
     * Formats a date and time for use in a filename as YYYYMMDD_HHMM.
     * @param date The date to format.
     * @returns A string representing the formatted date and time for a filename.
     */
    static formatDateTimeForFilename(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}`;
    }

    /**
     * Parses a date string in the format YYYY-MM-DD and returns a Date object.
     * @param dateStr The date string to parse.
     * @returns A Date object representing the parsed date.
     */
    static parseDate(dateStr: string): Date {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    /**
     * Parses a time string in the format HH:MM:SS and returns a Date object.
     * @param timeStr The time string to parse.
     * @returns A Date object representing the parsed time.
     */
    static parseTime(timeStr: string): Date {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, seconds, 0);
        return date;
    }

    /**
     * Parses a date-time string in the format YYYY-MM-DD HH:MM:SS and returns a Date object.
     * @param dateTimeStr The date-time string to parse.
     * @returns A Date object representing the parsed date and time.
     */
    static parseDateTime(dateTimeStr: string): Date {
        const [dateStr, timeStr] = dateTimeStr.split(' ');
        const date = this.parseDate(dateStr);
        const time = this.parseTime(timeStr);
        date.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
        return date;
    }

    /**
     * Adds a specified number of days to a date.
     * @param date The date to add days to.
     * @param days The number of days to add.
     * @returns A new Date object representing the date with the added days.
     */
    static addDays(date: Date, days: number): Date {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        return newDate;
    }

    /**
     * Adds a specified number of hours to a date.
     * @param date The date to add hours to.
     * @param hours The number of hours to add.
     * @returns A new Date object representing the date with the added hours.
     */
    static addHours(date: Date, hours: number): Date {
        const newDate = new Date(date);
        newDate.setHours(newDate.getHours() + hours);
        return newDate;
    }

    /**
     * Adds a specified number of minutes to a date.
     * @param date The date to add minutes to.
     * @param minutes The number of minutes to add.
     * @returns A new Date object representing the date with the added minutes.
     */
    static addMinutes(date: Date, minutes: number): Date {
        const newDate = new Date(date);
        newDate.setMinutes(newDate.getMinutes() + minutes);
        return newDate;
    }

    /**
     * Adds a specified number of seconds to a date.
     * @param date The date to add seconds to.
     * @param seconds The number of seconds to add.
     * @returns A new Date object representing the date with the added seconds.
     */
    static addSeconds(date: Date, seconds: number): Date {
        const newDate = new Date(date);
        newDate.setSeconds(newDate.getSeconds() + seconds);
        return newDate;
    }

    /**
     * Calculates the difference in days between two dates.
     * @param date1 The first date.
     * @param date2 The second date.
     * @returns The difference in days between the two dates.
     */
    static diffInDays(date1: Date, date2: Date): number {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    /**
     * Calculates the difference in hours between two dates.
     * @param date1 The first date.
     * @param date2 The second date.
     * @returns The difference in hours between the two dates.
     */
    static diffInHours(date1: Date, date2: Date): number {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600));
    }

    /**
     * Calculates the difference in minutes between two dates.
     * @param date1 The first date.
     * @param date2 The second date.
     * @returns The difference in minutes between the two dates.
     */
    static diffInMinutes(date1: Date, date2: Date): number {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(timeDiff / (1000 * 60));
    }

    /**
     * Calculates the difference in seconds between two dates.
     * @param date1 The first date.
     * @param date2 The second date.
     * @returns The difference in seconds between the two dates.
     */
    static diffInSeconds(date1: Date, date2: Date): number {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(timeDiff / 1000);
    }
}
