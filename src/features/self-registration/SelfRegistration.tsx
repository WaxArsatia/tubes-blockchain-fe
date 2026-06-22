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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
          <FieldGroup>
            <Field data-invalid={identity.length > 0 && !identity.trim()}>
              <FieldLabel htmlFor="identity">
                Nama atau identitas layanan
              </FieldLabel>
              <Input
                id="identity"
                value={identity}
                aria-invalid={identity.length > 0 && !identity.trim()}
                onChange={(event) => setIdentity(event.target.value)}
                placeholder="Contoh: Klinik Sehat Sentosa"
              />
            </Field>
          </FieldGroup>
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
