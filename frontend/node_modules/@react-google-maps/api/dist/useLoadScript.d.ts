import { type LoadScriptUrlOptions } from './utils/make-load-script-url.js';
export type UseLoadScriptOptions = LoadScriptUrlOptions & {
    id?: string | undefined;
    nonce?: string | undefined;
    preventGoogleFontsLoading?: boolean | undefined;
    apiUrl?: string;
};
export declare function useLoadScript({ id, version, nonce, googleMapsApiKey, googleMapsClientId, language, region, libraries, preventGoogleFontsLoading, channel, mapIds, authReferrerPolicy, apiUrl, }: UseLoadScriptOptions): {
    isLoaded: boolean;
    loadError: Error | undefined;
    url: string;
};
