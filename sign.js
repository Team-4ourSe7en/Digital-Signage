
document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('timezoneSelection');


    function updateTime() {
        const now = new Date();
        const selectedTimezone = selector.value;

        const timeString = new Intl.DateTimeFormat('en-US', {
            timeZone: selectedTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).format(now);

        clockDisplay.textContent = timeString;


    }
    setInterval(updateTime, 1000);

    updateTime();

    function updateDate () {
        const dateDisplay = document.getElementById('date-display');

        const now = new Date();

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
        const formattedDate = now.toLocaleDateString(undefined, options);

        dateDisplay.textContent = formattedDate;
    }

    updateDate();

    


});
