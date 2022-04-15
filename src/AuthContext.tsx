import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
const {CLIENT_ID}=process.env;
const {REDIRECT_URL}=process.env;
import * as AuthSession from 'expo-auth-session'
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import keys from './utils/keys';

interface AuthProviderProps{
    children:ReactNode
}

interface IAuthContextData{
    user:User;
    signInWithGoogle():Promise<void>;
    signInWithApple():Promise<void>;
    signOut():Promise<void>;
    userStorageLoading:boolean;
}

interface User{
id:string;
name:string;
email:string;
photo?:string;
}

interface AuthorizationResponse{
    params:{
        access_token:string;
    }
    type:string;
}

interface ErrorType{
    error:()=>Error;
}

const AuthContext=createContext({} as IAuthContextData);

export default function AuthProvider({children}:AuthProviderProps){

    const [user,setUser]=useState<User>({}as User);
    const [userStorageLoading,setUserStorageLoading]=useState(true);
    const signInWithGoogle=async()=> {
        try {
            
            const RESPONSE_TYPE='token';
            const SCOPE=encodeURI('profile email');
            

           const authUrl=`https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URL}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}`;

           const {type,params}= await AuthSession.startAsync({authUrl})as AuthorizationResponse; 
            if(type=='success'){
                const response=await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${params.access_token}`);

                if(response.status===200){
                     const userInfo=await response.json();
                console.log(userInfo);
                const userLogged={
                    id: String(userInfo.id),
                    name: userInfo.given_name,
                    email: userInfo.email,
                    photo: userInfo?.picture,
                }
                setUser(userLogged);

                await AsyncStorage.setItem(keys.storage.user,JSON.stringify(userLogged));
                
                }else{
                    const errorResponse=await response.json()
                    throw new Error(JSON.stringify(errorResponse.error));
                }
                
               
            }
           
        } catch (error : any) {
            throw new Error(error);
        }
    }

    const signInWithApple=async()=>{
        try {
            const credential=await AppleAuthentication.signInAsync({
                requestedScopes:[
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ]
            });

            if(credential){
                console.log(credential);
                
                const userLogged={
                    id: String(credential.user),
                    name: credential.fullName!.givenName!,
                    email: credential.email!,
                    photo: undefined,
                };
                 setUser(userLogged);

            await AsyncStorage.setItem(keys.storage.user,JSON.stringify(userLogged));
            }
        } catch (error:any) {
            throw new Error(error);
        }
    }

    const signOut=async()=>{
        setUser( {}as User);
        await AsyncStorage.removeItem(keys.storage.user);
    }

    useEffect(()=>{
        async function loadUserStorageData(){
            const userStored=await AsyncStorage.getItem(keys.storage.user);

            if(userStored){
                const userLogged=JSON.parse(userStored) as User;
                setUser(userLogged);
            }
            setUserStorageLoading(false);
        }

        loadUserStorageData();
    },[])

    return <AuthContext.Provider value={{user,signInWithGoogle, signInWithApple, signOut,userStorageLoading}}>
        {children}
    </AuthContext.Provider>
}

export const useAuthContext=()=>{
    const context=useContext(AuthContext);
    const {user,signInWithGoogle,signInWithApple,signOut,userStorageLoading}=context;
    return {user,signInWithGoogle,signInWithApple,signOut,userStorageLoading}
    // return context;
}
