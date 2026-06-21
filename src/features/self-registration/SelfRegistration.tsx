import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRegisterUser } from "@/hooks/useBpjsContract"

export function SelfRegistration() {
  const [identity, setIdentity] = useState("")
  const registerUser = useRegisterUser()

  return (
    <Card className="mx-auto mt-8 max-w-xl">
      <CardHeader>
        <CardTitle>Daftarkan identitas</CardTitle>
        <CardDescription>
          Wallet ini belum memiliki role aktif. Simpan identitas, lalu minta
          admin menetapkan role BPJS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (identity.trim()) registerUser.mutate(identity.trim())
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="identity">Nama atau identitas layanan</Label>
            <Input
              id="identity"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              placeholder="Contoh: Klinik Sehat Sentosa"
            />
          </div>
          <Button
            type="submit"
            disabled={!identity.trim() || registerUser.isPending}
          >
            Simpan identitas
          </Button>
        </form>
        {registerUser.isSuccess ? (
          <Alert className="mt-4">
            <AlertTitle>Identitas tersimpan</AlertTitle>
            <AlertDescription>
              Admin perlu menetapkan role sebelum dashboard tersedia.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}
