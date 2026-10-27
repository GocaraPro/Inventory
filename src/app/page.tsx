import { redirect } from "next/navigation";
import { isDemo } from "@/lib/db";
import { isOwner } from "@/lib/access";
import { getHoldings,getSnapshots,getSyncInfo } from "@/lib/repository";
import { demoHoldings,demoSnapshots } from "@/lib/demo";
import Dashboard from "@/components/dashboard";
export const dynamic="force-dynamic";
export default async function Page() {
  const demo=isDemo();
  if(!demo && !process.env.DATABASE_URL) return <main className="auth-screen"><section className="auth-card"><span className="pokeball"/><h1>Your collection starts here.</h1><p>The app is built. Connect your database and email sign-in to open your private inventory.</p><p className="muted">Follow the deployment steps in the project README. Demo mode is available only in local development.</p></section></main>;
  if(!await isOwner())redirect("/login");
  const [holdings,snapshots,sync]=demo?[demoHoldings,demoSnapshots,{lastSuccess:null,sourceDate:null,error:null}]:await Promise.all([getHoldings(),getSnapshots(),getSyncInfo()]);
  return <Dashboard initialHoldings={holdings} snapshots={snapshots} sync={sync} demo={demo}/>;
}
