export type Role = 'admin' | 'editor' | 'client'

type RoleAccessArgs =
  | {
      req?: {
        user?: unknown
      } | null
    }
  | null
  | undefined

const roleOf = (args: RoleAccessArgs): Role | undefined => {
  const user = args?.req?.user

  if (!user || typeof user !== 'object') return undefined

  const role = Reflect.get(user, 'role')

  return role === 'admin' || role === 'editor' || role === 'client' ? role : undefined
}

export const adminOnly = (args: RoleAccessArgs) => roleOf(args) === 'admin'

export const editorialOnly = (args: RoleAccessArgs) => {
  const role = roleOf(args)

  return role === 'admin' || role === 'editor'
}

export const clientOnly = (args: RoleAccessArgs) => roleOf(args) === 'client'

export const canAccessAdmin = editorialOnly

export const publishedOrEditorial = (args: RoleAccessArgs) =>
  editorialOnly(args) ? true : { _status: { equals: 'published' as const } }
