package com.hiresphere;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.time.Duration;
public class LoginTest {

    WebDriver driver;


    @BeforeMethod
    public void setup() {

        driver = new ChromeDriver();
        driver.manage().window().maximize();

        // React frontend login page
        driver.get("http://localhost:5173/login");
    }


   @Test
public void validLoginTest() {

    driver.findElement(By.name("email"))
            .sendKeys("navya@gmail.com");

    driver.findElement(By.name("password"))
            .sendKeys("123456");

    driver.findElement(
            By.xpath("//button[contains(text(),'Sign in')]")
    ).click();


    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

    wait.until(
            ExpectedConditions.urlContains("/dashboard")
    );

    String currentUrl = driver.getCurrentUrl();

    Assert.assertTrue(
            currentUrl.contains("/dashboard"),
            "Login failed - dashboard not opened"
    );
}

 @Test
public void invalidLoginTest() {

    driver.findElement(By.name("email"))
            .sendKeys("wrong@gmail.com");

    driver.findElement(By.name("password"))
            .sendKeys("wrongpassword");

    driver.findElement(
            By.xpath("//button[contains(text(),'Sign in')]")
    ).click();


    WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

    WebElement errorMessage = wait.until(
            ExpectedConditions.visibilityOfElementLocated(
                    By.xpath("//*[contains(text(),'Invalid credentials')]")
            )
    );

    String error = errorMessage.getText();

    Assert.assertEquals(error, "Invalid credentials");
}

    @AfterMethod
    public void tearDown() {

       // driver.quit();

    }
}
