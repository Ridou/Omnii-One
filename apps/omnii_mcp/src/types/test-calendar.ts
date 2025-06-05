import { ComposioToolSet, Actions, App } from "composio-core"; // Use base ComposioToolSet

// Initialize base ToolSet
const baseToolset = new ComposioToolSet();

async function inspectSchema() {
    // Get the raw schema for a specific Google Calendar action
    // Bypass the check for an active Google Calendar connection
    const calendarSchemas = await baseToolset.getActionsSchema( // Note: Method name might differ slightly or require client access depending on SDK version/structure
       { actions: [Actions.GOOGLECALENDAR_LIST_CALENDARS] },
       undefined, // entityId - not relevant here
       // Pass underlying client option if needed, or use client directly:
       // await baseToolset.client.actions.get({ actions: [Action.GOOGLECALENDAR_LIST_CALENDARS] })
       // The exact TS equivalent depends on how schema fetching bypassing checks is exposed.
       // Assuming getActionsSchema handles it conceptually:
       // check_connected_accounts=false equivalent might be implicit or require direct client usage.
       // This example assumes a conceptual equivalent exists on the toolset for simplicity.
    );


    if (calendarSchemas && calendarSchemas.length > 0) {
        console.log("Raw Schema for GOOGLECALENDAR_LIST_CALENDARS:");
        // calendarSchemas is an array, access the first element
        console.log(JSON.stringify(calendarSchemas[0], null, 2));
         // Adjust access based on actual return type (might be ActionModel-like objects)
    } else {
        console.log("Schema not found.");
    }

     // Fetching by app:
     // const githubSchemas = await baseToolset.getActionsSchema({ apps: ["github"] });
}

inspectSchema();

// Note: The TypeScript example is conceptual. Direct schema fetching bypassing connection checks
// might require using `baseToolset.client.actions.get(...)` directly if `getActionsSchema`
// on the ToolSet enforces checks or framework formatting. Refer to TS SDK specifics.

