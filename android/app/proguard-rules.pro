# Campus Connect — ProGuard / R8 Release Security Hardening Rules

# 1. Strip sensitive Android Log calls in release builds (prevents telemetry and token leakage)
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
}

# 2. Obfuscate package names and class names
-repackageclasses 'edu.campusconnect.internal'
-allowaccessmodification

# 3. Retain Room Database annotations and entities
-keep class androidx.room.** { *; }
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# 4. Retain SQLCipher native bindings
-keep class net.zetetic.database.sqlcipher.** { *; }
-dontwarn net.zetetic.database.sqlcipher.**

# 5. Retain Retrofit and Gson data models
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class edu.campusconnect.core.network.model.** { *; }
-keepclassmembers class edu.campusconnect.core.network.model.** { *; }

# 6. AndroidX Security Crypto MasterKey
-keep class androidx.security.crypto.** { *; }
