import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const HubSpotCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing HubSpot authorization...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(errorDescription || "Authorization was denied or failed");

      // Notify parent window of error
      if (window.opener) {
        window.opener.postMessage(
          { type: "HUBSPOT_AUTH_ERROR", error: errorDescription || error },
          window.location.origin
        );
        setTimeout(() => window.close(), 2000);
      }
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing authorization code or state parameter");
      return;
    }

    // Extract organization ID from state (format: org_{orgId}_{timestamp})
    const stateMatch = state.match(/^org_([^_]+)_/);
    if (!stateMatch) {
      setStatus("error");
      setMessage("Invalid state parameter");
      return;
    }

    const organizationId = stateMatch[1];

    // Send the code to the parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "HUBSPOT_AUTH_SUCCESS",
          code,
          state,
          organizationId,
        },
        window.location.origin
      );

      setStatus("success");
      setMessage("Authorization successful! This window will close...");

      // Close the popup after a brief delay
      setTimeout(() => window.close(), 1500);
    } else {
      // If not in a popup, show success and suggest closing
      setStatus("success");
      setMessage("Authorization successful! You can close this window and return to TicketFlo.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center border border-gray-700">
        {/* HubSpot Logo */}
        <div className="w-16 h-16 mx-auto mb-6 bg-[#ff7a59] rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
            <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.982V3.06A2.06 2.06 0 0017.37 1h-.042a2.06 2.06 0 00-2.06 2.06v.042c0 .86.496 1.604 1.218 1.963V7.93a5.728 5.728 0 00-3.044 1.609l-6.9-5.364a2.448 2.448 0 00.097-.682A2.448 2.448 0 004.193 1.05a2.448 2.448 0 00-2.444 2.443 2.448 2.448 0 002.444 2.444c.453 0 .874-.129 1.24-.342l6.787 5.276a5.764 5.764 0 00-.373 2.043c0 .726.136 1.42.382 2.06l-2.026 1.576a2.052 2.052 0 00-1.136-.346 2.06 2.06 0 00-2.06 2.06A2.06 2.06 0 009.067 20.4c.53 0 1.014-.204 1.38-.535l2.122-1.65a5.764 5.764 0 003.595 1.26 5.775 5.775 0 005.769-5.769 5.763 5.763 0 00-3.769-5.776zm-1.831 8.69a2.914 2.914 0 01-2.91-2.914 2.914 2.914 0 012.91-2.91 2.914 2.914 0 012.914 2.91 2.914 2.914 0 01-2.914 2.914z"/>
          </svg>
        </div>

        {/* Status Icon */}
        <div className="mb-4">
          {status === "processing" && (
            <Loader2 className="w-12 h-12 text-[#ff7a59] animate-spin mx-auto" />
          )}
          {status === "success" && (
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          )}
          {status === "error" && (
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          )}
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-white mb-2">
          {status === "processing" && "Connecting to HubSpot"}
          {status === "success" && "Connected!"}
          {status === "error" && "Connection Failed"}
        </h2>
        <p className="text-gray-400">{message}</p>

        {/* Manual close button for error state */}
        {status === "error" && (
          <button
            onClick={() => window.close()}
            className="mt-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close Window
          </button>
        )}
      </div>
    </div>
  );
};

export default HubSpotCallback;
