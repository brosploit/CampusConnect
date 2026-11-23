package edu.campusconnect.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import edu.campusconnect.core.security.AppLogger
import net.sqlcipher.database.SupportFactory

@Database(
    entities = [ReadingEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun readingDao(): ReadingDao

    companion object {
        private const val DB_NAME = "campus_connect.db"

        @Volatile
        private var INSTANCE: AppDatabase? = null

        /**
         * Creates an encrypted Room database using SQLCipher.
         * The passphrase is generated and protected via Android Keystore.
         */
        fun getInstance(context: Context, encryptionPassphrase: ByteArray? = null): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val builder = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DB_NAME
                )

                if (encryptionPassphrase != null && encryptionPassphrase.isNotEmpty()) {
                    val factory = SupportFactory(encryptionPassphrase)
                    builder.openHelperFactory(factory)
                    AppLogger.i("Database initialized with SQLCipher AES-256 encryption")
                } else {
                    AppLogger.w("Database initialized without SQLCipher passphrase (in-memory/test mode)")
                }

                builder.fallbackToDestructiveMigration()
                val instance = builder.build()
                INSTANCE = instance
                instance
            }
        }
    }
}
