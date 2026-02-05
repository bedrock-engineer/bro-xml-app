import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("set-language", "routes/set-language.ts"),
  route("info", "routes/info.tsx"),
  route("feedback", "routes/feedback.tsx"),
] satisfies RouteConfig;
