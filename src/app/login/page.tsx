import { LoginForm } from "@/components/login-form"
import { toQueryString } from "@/lib/search-params"

export default async function Page({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm query={toQueryString(await searchParams)} />
      </div>
    </div>
  )
}
