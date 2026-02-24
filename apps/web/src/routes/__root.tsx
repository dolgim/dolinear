import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-gray-100 font-sans antialiased">
      <Outlet />
    </div>
  );
}
