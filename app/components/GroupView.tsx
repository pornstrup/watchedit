'use client'

type Group = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export default function GroupView({
  groupId,
  group,
  onRefresh,
}: {
  groupId: string
  group: Group
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <p className="text-white/30 text-sm">Gruppe-visning kommer snart</p>
    </div>
  )
}