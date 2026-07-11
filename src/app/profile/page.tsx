// Profile page removed — anything that still links here lands on the dashboard.
// (The file itself only remains because it can't be deleted from this
// environment; you can delete the whole src/app/profile folder yourself.)
import { redirect } from "next/navigation";

export default function Profile() {
  redirect("/dashboard");
}
