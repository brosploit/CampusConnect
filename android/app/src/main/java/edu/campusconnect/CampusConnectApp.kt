package edu.campusconnect

import android.app.Application
import edu.campusconnect.core.database.AppDatabase
import edu.campusconnect.core.security.AppLogger
import edu.campusconnect.core.security.KeystoreManager
import net.sqlcipher.database.SQLiteDatabase
import java.security.SecureRandom

class CampusConnectApp : Application() {

    override fun onCreate() {
        super.onCreate()
        AppLogger.i("CampusConnectApp initializing")

        // Initialize SQLCipher native binaries
        try {
            SQLiteDatabase.loadLibs(this)
            val keystore = KeystoreManager()
            // Derive or generate database encryption key
            val dbKey = keystore.encrypt("campus_connect_sqlite_passphrase".toByteArray())
            AppDatabase.getInstance(this, dbKey)
        } catch (e: Exception) {
            AppLogger.w("SQLCipher initialization fallback to standard SQLite", e)
            AppDatabase.getInstance(this, null)
        }
    }
}
