import { SignupForm } from "@/components/signup-form"
import { toQueryString } from "@/lib/search-params"

export default async function Page({ searchParams }: PageProps<"/signup">) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm query={toQueryString(await searchParams)} />
      </div>
    </div>
  )
}
