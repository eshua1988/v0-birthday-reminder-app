import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Проверьте почту</CardTitle>
            <CardDescription className="text-center">Мы отправили вам письмо с подтверждением</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Пожалуйста, проверьте вашу электронную почту и перейдите по ссылке для подтверждения аккаунта. После
              подтверждения вы сможете войти в систему.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
