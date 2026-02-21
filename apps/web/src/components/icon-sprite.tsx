export function IconSprite() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <symbol id="icon-signal" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M2 20h2v-4H2v4Zm4 0h2v-7H6v7Zm4 0h2V9h-2v11Zm4 0h2V5h-2v15Zm4 0h2V2h-2v18Z"
          />
        </symbol>
        <symbol id="icon-wifi" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 18.5a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5Zm0-4.5a5 5 0 0 1 4.33 2.56l-1.72 1A3 3 0 0 0 12 15a3 3 0 0 0-2.61 2.06l-1.72-1A5 5 0 0 1 12 14Zm0-5a9 9 0 0 1 7.79 4.33l-1.72 1A7 7 0 0 0 12 11a7 7 0 0 0-6.07 3.83l-1.72-1A9 9 0 0 1 12 9Zm0-5a13 13 0 0 1 11.26 6.26l-1.72 1A11 11 0 0 0 12 6 11 11 0 0 0 2.46 11.26l-1.72-1A13 13 0 0 1 12 4Z"
          />
        </symbol>
        <symbol id="icon-battery" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M17 7h-1V5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2h1a3 3 0 0 0 3-3 3 3 0 0 0-3-3Zm-3 8H4V6h10Zm3-3h-1V9h1a1 1 0 0 1 0 2Z"
          />
        </symbol>
        <symbol id="icon-dashboard" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M11 4H4a1 1 0 0 0-1 1v7h8V4Zm10 9h-8v7h7a1 1 0 0 0 1-1v-6Zm0-9h-7v7h8V5a1 1 0 0 0-1-1ZM4 13h7v7H4a1 1 0 0 1-1-1v-6Z"
          />
        </symbol>
        <symbol id="icon-tasks" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M9 3H5a2 2 0 0 0-2 2v4h6V3ZM21 3h-4v6h6V5a2 2 0 0 0-2-2ZM9 11H3v4a2 2 0 0 0 2 2h4v-6Zm6-8h-6v6h6V3Zm-6 14H5a2 2 0 0 0-2 2v2h6v-4Zm6-8h-6v6h6v-6Zm2 0v6h4a2 2 0 0 0 2-2v-4h-6Zm0 8v4h4v-2a2 2 0 0 0-2-2h-2Z"
          />
        </symbol>
        <symbol id="icon-review" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M4 3h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5l-5 5v-5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3.5 5a1.5 1.5 0 1 0 1.5 1.5A1.5 1.5 0 0 0 7.5 8Zm4.5 0H7v1h5Zm5 0h-3v1h3Z"
          />
        </symbol>
        <symbol id="icon-market" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M4 4h16v2l-2 4v6a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3v-6L4 6V4Zm7 6h2v6h-2Zm-4 0h2v6a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-6h2v6a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3Z"
          />
        </symbol>
        <symbol id="icon-profile" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z"
          />
        </symbol>
        <symbol id="icon-chevron" viewBox="0 0 24 24">
          <path fill="currentColor" d="m9 6 6 6-6 6V6Z" />
        </symbol>
        <symbol id="icon-plus" viewBox="0 0 24 24">
          <path fill="currentColor" d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5h-2Z" />
        </symbol>
        <symbol id="icon-globe" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2c1.35 0 2.6 2.17 3.24 5H8.76C9.4 6.17 10.65 4 12 4Zm-4.9 7h2.13a16 16 0 0 0 0 2H7.1a8.16 8.16 0 0 1 0-2Zm.82 4h1.91c-.54 1.94-1.35 3.22-1.91 3.69A8 8 0 0 1 7.92 15Zm6.83 0h1.91a8 8 0 0 1-1.91 3.69c-.56-.47-1.37-1.75-1.91-3.69Zm.15-2a16 16 0 0 0 0-2h2.13a8.16 8.16 0 0 1 0 2Zm-6.14-4h6.5a14.58 14.58 0 0 1 0 4h-6.5a14.58 14.58 0 0 1 0-4Zm3.24 11c1.35 0 2.6-2.17 3.24-5h-6.48c.64 2.83 1.89 5 3.24 5Z"
          />
        </symbol>
        <symbol id="icon-calendar" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M7 2v2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-2V2h-2v2H9V2Zm12 6H5v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1Zm-8 3h2v2h-2Zm-4 0h2v2H7Zm8 0h2v2h-2Z"
          />
        </symbol>
        <symbol id="icon-sun" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 5a1 1 0 0 1-1-1V2h2v2a1 1 0 0 1-1 1Zm0 14a1 1 0 0 1 1 1v2h-2v-2a1 1 0 0 1 1-1Zm7-7a1 1 0 0 1 1-1h2v2h-2a1 1 0 0 1-1-1ZM4 12a1 1 0 0 1-1 1H1v-2h2a1 1 0 0 1 1 1Zm13.95 6.95 1.41 1.41-1.41 1.41-1.41-1.41a1 1 0 0 1 1.41-1.41Zm-11.9 0a1 1 0 0 1 0 1.41L4.64 21.8 3.22 20.4l1.41-1.41a1 1 0 0 1 1.41 0ZM18.78 3.22l1.41 1.41-1.41 1.41-1.41-1.41a1 1 0 0 1 1.41-1.41Zm-13.56 0a1 1 0 0 1 1.41 0l1.41 1.41-1.41 1.41-1.41-1.41a1 1 0 0 1 0-1.41ZM12 7a5 5 0 1 0 5 5 5 5 0 0 0-5-5Z"
          />
        </symbol>
        <symbol id="icon-moon" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M20 13.5A8.5 8.5 0 0 1 10.5 4a8.41 8.41 0 0 1 1.09-4A10.5 10.5 0 1 0 24 13.5a10.41 10.41 0 0 0-4-.91 8.43 8.43 0 0 1 0 .91Z"
          />
        </symbol>
      </defs>
    </svg>
  );
}
