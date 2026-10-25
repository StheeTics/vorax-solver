export const REPO_URL = 'https://github.com/tidewarden/tli-vorax-simulator'
export const ISSUES_URL = `${REPO_URL}/issues/new/choose`
/** Vorax Overlay, the Windows app (desktop/): the newest release's page on GitHub, with its notes and installer
 *  (a page people can check before downloading, rather than an .exe straight from a link). */
export const DOWNLOAD_URL = `${REPO_URL}/releases/latest`
/** The Optimal Play guide page, served next to the game. */
export const GUIDE_URL = `${import.meta.env.BASE_URL}optimal-play.html`
export const HOME_URL = import.meta.env.BASE_URL
export const SIMULATOR_URL = `${import.meta.env.BASE_URL}simulator.html`
export const SOLVER_URL = `${import.meta.env.BASE_URL}solver.html`
/** The code's repo, where the Solver's Report this board files its issues (with the solver-reading form). */
export const CODE_REPO_URL = 'https://github.com/tidewarden/vorax-solver'
export const SOLVER_ISSUE_URL = `${CODE_REPO_URL}/issues/new`
/** Tips for the maintainer, linked quietly from the Solver's corner. */
export const SUPPORT_URL = 'https://buymeacoffee.com/tidewarden'
