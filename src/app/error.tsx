"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="auth-screen"><section className="auth-card"><h1>We couldn’t load your inventory.</h1><p>Please check your connection and try again. Your saved collection has not been changed.</p><button className="button primary" onClick={reset}>Try again</button></section></main>;}
