import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  // Optional :broId so "/" and "/CPT000000000029" are one route module: the
  // App component (and all loaded-file state) survives navigation between
  // objects. Static routes rank higher, so the routes below still win.
  route(":broId?", "routes/home.tsx"),
  route("set-language", "routes/set-language.ts"),
  route("info", "routes/info.tsx"),
  route("feedback", "routes/feedback.tsx"),
  route("api/bro/:broId", "routes/bro-object-xml.ts"),
] satisfies RouteConfig;
