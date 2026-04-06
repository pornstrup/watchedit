export type OpenSearchDetail = {
  groupId?: string | null
}

export const OPEN_SEARCH_EVENT = 'open-search'

export function dispatchOpenSearch(groupId: string | null) {
  window.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, {
    detail: { groupId },
  }))
}
