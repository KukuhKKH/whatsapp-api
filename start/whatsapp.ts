import nodeCleanup from 'node-cleanup'
import WA from 'App/Services/Wa'

WA.init()
nodeCleanup(WA.cleanup)
