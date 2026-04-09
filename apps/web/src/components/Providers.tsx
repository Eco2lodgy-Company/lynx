"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient, setQueryApiClient } from "@lynx/api-client";

const BASE_PATH = "/lynx";

// Initialize API client for web
const api = createApiClient(`${BASE_PATH}/api`);
setQueryApiClient(api);

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
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    return (
        <SessionProvider basePath={`${BASE_PATH}/api/auth`}>
            <QueryClientProvider client={queryClient}>
                <PatchFetch />
                {children}
            </QueryClientProvider>
        </SessionProvider>
    );
}
