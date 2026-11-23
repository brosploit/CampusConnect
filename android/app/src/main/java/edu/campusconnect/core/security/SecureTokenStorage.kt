package edu.campusconnect.core.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure token and session storage interface.
 */
interface ISecureTokenStorage {
    fun saveTokens(accessToken: String, refreshToken: String, userId: String, role: String)
    fun getAccessToken(): String?
    fun getRefreshToken(): String?
    fun getUserId(): String?
    fun getUserRole(): String?
    fun hasValidSession(): Boolean
    fun clearSession()
}

/**
 * Production implementation of SecureTokenStorage.
 * Stores authentication tokens using EncryptedSharedPreferences backed by AndroidX Security MasterKey (AES-256-GCM).
 * Falls back to KeystoreManager envelope encryption if EncryptedSharedPreferences is unavailable.
 */
class SecureTokenStorage(
    private val context: Context,
    private val preferencesFileName: String = PREFS_FILE_NAME
) : ISecureTokenStorage {

    companion object {
        const val PREFS_FILE_NAME = "cc_secure_tokens"
        private const val KEY_ACCESS_TOKEN = "enc_access_token"
        private const val KEY_REFRESH_TOKEN = "enc_refresh_token"
        private const val KEY_USER_ID = "enc_user_id"
        private const val KEY_USER_ROLE = "enc_user_role"
    }

    private val keystoreManager by lazy { KeystoreManager() }
    private var isUsingFallback = false

    private val sharedPreferences: SharedPreferences by lazy {
        createEncryptedPreferences()
    }

    private fun createEncryptedPreferences(): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                preferencesFileName,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            AppLogger.w("EncryptedSharedPreferences init failed; activating KeystoreManager envelope encryption", e)
            isUsingFallback = true
            context.getSharedPreferences(preferencesFileName, Context.MODE_PRIVATE)
        }
    }

    override fun saveTokens(accessToken: String, refreshToken: String, userId: String, role: String) {
        val editor = sharedPreferences.edit()
        if (isUsingFallback) {
            editor.putString(KEY_ACCESS_TOKEN, encryptFallback(accessToken))
            editor.putString(KEY_REFRESH_TOKEN, encryptFallback(refreshToken))
            editor.putString(KEY_USER_ID, encryptFallback(userId))
            editor.putString(KEY_USER_ROLE, encryptFallback(role))
        } else {
            editor.putString(KEY_ACCESS_TOKEN, accessToken)
            editor.putString(KEY_REFRESH_TOKEN, refreshToken)
            editor.putString(KEY_USER_ID, userId)
            editor.putString(KEY_USER_ROLE, role)
        }
        editor.apply()
    }

    override fun getAccessToken(): String? {
        val raw = sharedPreferences.getString(KEY_ACCESS_TOKEN, null) ?: return null
        return if (isUsingFallback) decryptFallback(raw) else raw
    }

    override fun getRefreshToken(): String? {
        val raw = sharedPreferences.getString(KEY_REFRESH_TOKEN, null) ?: return null
        return if (isUsingFallback) decryptFallback(raw) else raw
    }

    override fun getUserId(): String? {
        val raw = sharedPreferences.getString(KEY_USER_ID, null) ?: return null
        return if (isUsingFallback) decryptFallback(raw) else raw
    }

    override fun getUserRole(): String? {
        val raw = sharedPreferences.getString(KEY_USER_ROLE, null) ?: return null
        return if (isUsingFallback) decryptFallback(raw) else raw
    }

    private fun encryptFallback(plaintext: String): String {
        val cipherBytes = keystoreManager.encrypt(plaintext.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(cipherBytes, Base64.NO_WRAP)
    }

    private fun decryptFallback(base64Cipher: String): String? {
        return try {
            val cipherBytes = Base64.decode(base64Cipher, Base64.NO_WRAP)
            val decryptedBytes = keystoreManager.decrypt(cipherBytes)
            String(decryptedBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            AppLogger.e("Failed to decrypt token in fallback storage", e)
            null
        }
    }

    override fun hasValidSession(): Boolean {
        return !getAccessToken().isNullOrBlank()
    }

    override fun clearSession() {
        sharedPreferences.edit().clear().apply()
        AppLogger.i("Session cleared from secure token storage")
    }
}
