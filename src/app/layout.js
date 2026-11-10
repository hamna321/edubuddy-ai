import "./globals.css";

export const metadata = {
  title: "EduBuddy — Smart School Portal",
  description:
    "Role-based school portal with AI notes chat, grade prediction and emotional support.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
