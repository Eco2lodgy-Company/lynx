"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

const BASE_PATH = "/lynx";

function PatchFetch() {
    useEffect(() => {
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            if (typeof input === "string" && input.startsWith("/api/")) {
                input = `${BASE_PATH}${input}`;
            }
            return originalFetch.call(this, input, init);
        };
        return () => {
            window.fetch = originalFetch;
        };
    }, []);
    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider basePath={`${BASE_PATH}/api/auth`}>
            <PatchFetch />
            {children}
        </SessionProvider>
    );
}
